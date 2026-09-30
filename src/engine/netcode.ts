import { BinaryProtocol, PACKET_TYPES } from './protocol';
import { PlayerInput, PlayerState, VoxelDelta } from './types';
import { simulatePlayer } from './simulation';
import { RemoteSnapshotStore } from './interpolation';

export interface UnacknowledgedInput {
  seq: number;
  dt: number;
  input: PlayerInput;
  predPos: [number, number, number];
}

export interface ServerPlayerSnapshot extends PlayerState {
  ackSeq?: number;
}

export class NetcodeManager {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private pingMs = 0;
  private lastPingSentTime = 0;
  private reconnectTimer: number | null = null;
  private inputSequence = 0;
  private pendingInputs: UnacknowledgedInput[] = [];
  private localClientId: string | null = null;
  private roomId: string | null = null;
  private readonly remoteSnapshots = new RemoteSnapshotStore();

  public onServerSnapshot?: (players: ServerPlayerSnapshot[], tick: number, local?: ServerPlayerSnapshot) => void;
  public onVoxelDestruction?: (delta: VoxelDelta) => void;
  public onChatMessage?: (sender: string, text: string) => void;
  public onConnectionChanged?: (connected: boolean) => void;
  public onRoomChanged?: (roomId: string | null) => void;

  constructor() {
    if (typeof window !== 'undefined') this.connectWebSocket();
  }

  public connect() {
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) this.connectWebSocket();
  }

  public getSequence() {
    this.inputSequence = (this.inputSequence + 1) & 0xffff;
    return this.inputSequence;
  }

  public getPing() {
    return this.pingMs;
  }

  public isOnline() {
    return this.isConnected;
  }

  private connectWebSocket() {
    if (typeof window === 'undefined') return;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const params = new URLSearchParams(window.location.search);
      this.roomId = params.get('room');
      const roomQuery = this.roomId ? `?room=${encodeURIComponent(this.roomId)}` : '';
      this.ws = new WebSocket(`${protocol}//${window.location.host}/ws${roomQuery}`);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.isConnected = true;
        this.onConnectionChanged?.(true);
      };

      this.ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          this.handleBinaryMessage(event.data);
          return;
        }
        if (typeof event.data !== 'string') return;

        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INIT') {
            this.localClientId = data.clientId;
            this.roomId = typeof data.roomId === 'string' ? data.roomId : this.roomId;
            this.onRoomChanged?.(this.roomId);
          } else if (data.type === 'PONG') {
            this.pingMs = Math.max(0, Math.round(performance.now() - this.lastPingSentTime));
          } else if (data.type === 'CHAT') {
            this.onChatMessage?.(data.sender, data.text);
          } else if (data.type === 'SNAPSHOT') {
            const players = data.players as ServerPlayerSnapshot[];
            const local = players.find(p => p.id === this.localClientId);
            this.remoteSnapshots.push(data.tick, players.filter(p => p.id !== this.localClientId));
            this.onServerSnapshot?.(players, data.tick, local);
          }
        } catch {
          // Malformed network data is discarded.
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.onConnectionChanged?.(false);
        if (this.reconnectTimer === null) {
          this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            this.connectWebSocket();
          }, 1500);
        }
      };
      this.ws.onerror = () => {};
    } catch {
      this.isConnected = false;
      this.onConnectionChanged?.(false);
    }
  }

  private handleBinaryMessage(buffer: ArrayBuffer) {
    const view = new DataView(buffer);
    const packetType = view.getUint8(0);
    if (packetType === PACKET_TYPES.VOXEL_DESTRUCTION) {
      const delta = BinaryProtocol.unpackVoxelDelta(buffer);
      if (delta) {
        this.onVoxelDestruction?.({ ...delta, timestamp: Date.now() });
      }
    }
  }

  public sendInput(input: PlayerInput, posX: number, posY: number, posZ: number) {
    this.pendingInputs.push({
      seq: input.seq,
      dt: input.dt,
      input: { ...input },
      predPos: [posX, posY, posZ],
    });
    if (this.pendingInputs.length > 120) this.pendingInputs.shift();

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(BinaryProtocol.packClientInput(input, posX, posY, posZ));
    }
  }

  public acknowledge(seq: number) {
    this.pendingInputs = this.pendingInputs.filter(item => item.seq > seq);
  }

  public getPendingInputs() {
    return this.pendingInputs.slice();
  }

  public sampleRemotePlayers(time = performance.now()): PlayerState[] {
    return this.remoteSnapshots.sample(time);
  }

  public getRoomId() { return this.roomId; }

  public joinRoom(roomId: string) {
    this.roomId = roomId;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomId);
      window.history.replaceState({}, '', url);
    }
    this.ws?.close();
    this.ws = null;
    this.connectWebSocket();
  }

  public disconnect() {
    if (this.reconnectTimer !== null && typeof window !== 'undefined') window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
  }

  public sendVoxelDestruction(x: number, y: number, z: number, radius: number) {
    // Destruction is server-authoritative. This method is intentionally disabled
    // until a validated server-side weapon event is implemented.
    void x; void y; void z; void radius;
  }

  public sendChat(sender: string, text: string) {
    const safeText = text.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200);
    if (!safeText || this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'CHAT', sender: sender.slice(0, 32), text: safeText }));
  }

  public ping() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.lastPingSentTime = performance.now();
    this.ws.send(JSON.stringify({ type: 'PING' }));
  }

  public reconcile(serverLastAckSeq: number, serverPos: [number, number, number], currentPos: [number, number, number], serverVelocity: [number, number, number] = [0,0,0], serverGrounded = true) {
    this.acknowledge(serverLastAckSeq);

    // Rebuild the local prediction from the authoritative state, then replay
    // every input the server has not acknowledged yet.
    let predicted = {
      position: [...serverPos] as [number, number, number],
      velocity: [...serverVelocity] as [number, number, number],
      grounded: serverGrounded,
    };

    for (const pending of this.pendingInputs) {
      predicted = simulatePlayer(predicted, pending.input, pending.dt);
    }

    const drift = Math.hypot(
      currentPos[0] - predicted.position[0],
      currentPos[1] - predicted.position[1],
      currentPos[2] - predicted.position[2],
    );

    if (drift < 0.05) return currentPos;
    if (drift > 1.0) return predicted.position;

    const alpha = 0.45;
    return [
      currentPos[0] + (predicted.position[0] - currentPos[0]) * alpha,
      currentPos[1] + (predicted.position[1] - currentPos[1]) * alpha,
      currentPos[2] + (predicted.position[2] - currentPos[2]) * alpha,
    ] as [number, number, number];
  }
}

export const netcodeManager = new NetcodeManager();
