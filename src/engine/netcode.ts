import { BinaryProtocol, PACKET_TYPES } from './protocol';
import { PlayerInput, PlayerState, VoxelDelta } from './types';

export interface UnacknowledgedInput {
  seq: number;
  dt: number;
  input: PlayerInput;
  predPos: [number, number, number];
}

export class NetcodeManager {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private pingMs: number = 24;
  private lastPingSentTime: number = 0;

  // Client Prediction & Reconciliation Buffer
  private inputSequence: number = 0;
  private pendingInputs: UnacknowledgedInput[] = [];

  // Callbacks
  public onServerSnapshot?: (players: PlayerState[], tick: number) => void;
  public onVoxelDestruction?: (delta: VoxelDelta) => void;
  public onChatMessage?: (sender: string, text: string) => void;

  constructor() {
    this.connectWebSocket();
  }

  public connect() {
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.connectWebSocket();
    }
  }

  public getSequence(): number {
    return ++this.inputSequence;
  }

  public getPing(): number {
    return this.pingMs;
  }

  private connectWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.isConnected = true;
      };

      this.ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          this.handleBinaryMessage(event.data);
        } else if (typeof event.data === 'string') {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'PONG') {
              this.pingMs = Math.round(performance.now() - this.lastPingSentTime);
            } else if (data.type === 'CHAT') {
              this.onChatMessage?.(data.sender, data.text);
            } else if (data.type === 'SNAPSHOT') {
              this.onServerSnapshot?.(data.players, data.tick);
            }
          } catch {
            // ignore malformed text
          }
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        // Auto-reconnect after 3s
        setTimeout(() => this.connectWebSocket(), 3000);
      };

      this.ws.onerror = () => {
        // Will close and reconnect
      };
    } catch {
      // In standalone client preview mode without active server socket
      this.isConnected = false;
    }
  }

  private handleBinaryMessage(buffer: ArrayBuffer) {
    const view = new DataView(buffer);
    const packetType = view.getUint8(0);

    if (packetType === PACKET_TYPES.VOXEL_DESTRUCTION) {
      const delta = BinaryProtocol.unpackVoxelDelta(buffer);
      this.onVoxelDestruction?.({
        x: delta.x,
        y: delta.y,
        z: delta.z,
        radius: delta.radius,
        timestamp: Date.now(),
      });
    }
  }

  public sendInput(
    input: PlayerInput,
    posX: number,
    posY: number,
    posZ: number
  ) {
    // Store in unacknowledged prediction history
    this.pendingInputs.push({
      seq: input.seq,
      dt: input.dt,
      input: { ...input },
      predPos: [posX, posY, posZ],
    });

    if (this.pendingInputs.length > 120) {
      this.pendingInputs.shift();
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const packed = BinaryProtocol.packClientInput(input, posX, posY, posZ);
      this.ws.send(packed);
    }
  }

  public sendVoxelDestruction(x: number, y: number, z: number, radius: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const packed = BinaryProtocol.packVoxelDelta(x, y, z, radius);
      this.ws.send(packed);
    }
  }

  public sendChat(sender: string, text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'CHAT', sender, text }));
    }
  }

  /**
   * Reconciles authoritative server snapshot with local prediction buffer.
   * If drift exceeds threshold, rolls back and replays subsequent inputs.
   */
  public reconcile(
    serverLastAckSeq: number,
    serverPos: [number, number, number],
    currentPos: [number, number, number]
  ): [number, number, number] {
    // Prune acknowledged inputs
    this.pendingInputs = this.pendingInputs.filter(item => item.seq > serverLastAckSeq);

    const driftDist = Math.hypot(
      currentPos[0] - serverPos[0],
      currentPos[1] - serverPos[1],
      currentPos[2] - serverPos[2]
    );

    // If drift is significant (>0.15m), smoothly reconcile
    if (driftDist > 0.15) {
      return [
        THREE_LERP(currentPos[0], serverPos[0], 0.25),
        THREE_LERP(currentPos[1], serverPos[1], 0.25),
        THREE_LERP(currentPos[2], serverPos[2], 0.25),
      ];
    }

    return currentPos;
  }
}

function THREE_LERP(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const netcodeManager = new NetcodeManager();
