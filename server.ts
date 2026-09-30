import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { BinaryProtocol, PACKET_TYPES } from './src/engine/protocol';
import { FIXED_DT, inputFlagsToPlayerInput, simulatePlayer } from './src/engine/simulation';
import { PlayerInput } from './src/engine/types';
import { RoomManager } from './src/engine/rooms';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = createServer(app);
const PORT = Number(process.env.PORT || 3000);
// Bind publicly so Google AI Studio's preview/proxy can reach the app.
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

interface ServerLeaderboardRecord {
  id: string; name: string; elo: number; kills: number; deaths: number;
  kdRatio: number; matchesPlayed: number; wins: number; lastActive: string;
}

const LEADERBOARD_DATA: ServerLeaderboardRecord[] = [
  { id: '1', name: 'Ghost_MW2', elo: 2420, kills: 1420, deaths: 420, kdRatio: 3.38, matchesPlayed: 85, wins: 72, lastActive: 'Just now' },
  { id: '2', name: 'Soap_MacTavish', elo: 2280, kills: 1190, deaths: 480, kdRatio: 2.47, matchesPlayed: 74, wins: 58, lastActive: '5m ago' },
  { id: '3', name: 'CaptainPrice', elo: 2150, kills: 980, deaths: 410, kdRatio: 2.39, matchesPlayed: 62, wins: 49, lastActive: '12m ago' },
  { id: '4', name: 'Roach_Specialist', elo: 1980, kills: 840, deaths: 460, kdRatio: 1.82, matchesPlayed: 55, wins: 38, lastActive: '25m ago' },
  { id: '5', name: 'Gaz_SAS', elo: 1840, kills: 710, deaths: 420, kdRatio: 1.69, matchesPlayed: 48, wins: 31, lastActive: '1h ago' },
  { id: '6', name: 'Alejandro_Vargas', elo: 1720, kills: 560, deaths: 390, kdRatio: 1.43, matchesPlayed: 40, wins: 24, lastActive: '2h ago' },
];

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', matchServer: 'BreachPoint Authoritative Node', tickRate: 30, players: clients.size });
});

app.get('/api/leaderboard', (_req: Request, res: Response) => res.json(LEADERBOARD_DATA));

app.get('/api/rooms', (_req: Request, res: Response) => res.json(rooms.list()));

app.post('/api/rooms', (req: Request, res: Response) => {
  const hostId = `host_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const map = typeof req.body?.map === 'string' ? req.body.map.slice(0, 40) : 'urban_industrial';
  const weather = typeof req.body?.weather === 'string' ? req.body.weather.slice(0, 40) : 'urban_clear';
  const botCount = Math.max(0, Math.min(16, Number(req.body?.botCount) || 0));
  const maxPlayers = Math.max(1, Math.min(32, Number(req.body?.maxPlayers) || 12));
  const room = rooms.create(hostId, { map, weather, botCount, maxPlayers });
  rooms.leave(room.id, hostId);
  res.status(201).json(rooms.summary(room.id));
});

app.post('/api/auth/token', (req: Request, res: Response) => {
  const raw = typeof req.body?.username === 'string' ? req.body.username : '';
  const username = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || `Operator_${Math.floor(Math.random() * 1000)}`;
  // Development session identifier only; this is deliberately not presented as a JWT.
  res.json({
    token: `dev_session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    user: { id: `usr_${Date.now()}`, name: username, elo: 1500 },
  });
});

interface ConnectedClient {
  ws: WebSocket;
  id: string;
  name: string;
  state: ReturnType<typeof createInitialState>;
  input: PlayerInput;
  lastAckSeq: number;
  team: 'spec_ops' | 'shadow_company';
  messagesThisSecond: number;
  messageWindowStart: number;
  roomId: string;
}

function createInitialState() {
  return {
    position: [
      (Math.random() - 0.5) * 20,
      1.7,
      (Math.random() - 0.5) * 20,
    ] as [number, number, number],
    velocity: [0, 0, 0] as [number, number, number],
    grounded: true,
    health: 100,
    armor: 150,
    score: 0,
    kills: 0,
    deaths: 0,
    weaponId: 'm4a1',
    ammoInClip: 30,
    reserveAmmo: 180,
  };
}

function createNeutralInput(seq = 0): PlayerInput {
  return {
    seq, dt: FIXED_DT, forward: false, backward: false, left: false, right: false,
    jump: false, crouch: false, slide: false, tacSprint: false, ads: false,
    fire: false, reload: false, leanLeft: false, leanRight: false,
    yaw: 0, pitch: 0, weaponIndex: 0,
  };
}

function isNewerSequence(next: number, previous: number) {
  const delta = (next - previous + 0x10000) & 0xffff;
  return delta > 0 && delta < 0x8000;
}

const clients = new Map<string, ConnectedClient>();
const rooms = new RoomManager();
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 });

wss.on('connection', (ws) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const requestedRoom = (() => {
    try { return new URL(ws.url || '', 'http://localhost').searchParams.get('room'); } catch { return null; }
  })();
  const client: ConnectedClient = {
    ws,
    id: clientId,
    name: `Operator_${clientId.slice(-4)}`,
    state: createInitialState(),
    input: createNeutralInput(),
    lastAckSeq: 0,
    team: clients.size % 2 === 0 ? 'spec_ops' : 'shadow_company',
    messagesThisSecond: 0,
    messageWindowStart: Date.now(),
    roomId: requestedRoom && rooms.has(requestedRoom) ? requestedRoom : '',
  };
  if (!client.roomId) {
    const room = rooms.create(clientId, { map: 'urban_industrial', weather: 'urban_clear', botCount: 4, maxPlayers: 12 });
    client.roomId = room.id;
  } else {
    rooms.join(client.roomId, clientId);
  }
  clients.set(clientId, client);

  ws.send(JSON.stringify({ type: 'INIT', clientId, roomId: client.roomId, team: client.team, tickRate: 30 }));

  ws.on('message', (raw) => {
    if (Buffer.isBuffer(raw)) {
      const packet = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
      const view = new DataView(packet);
      if (view.byteLength === 0) return;
      const type = view.getUint8(0);

      if (type === PACKET_TYPES.CLIENT_INPUT) {
        const decoded = BinaryProtocol.unpackClientInput(packet);
        if (!decoded || !isNewerSequence(decoded.seq, client.lastAckSeq)) return;

        // The position fields in the packet are intentionally ignored.
        // The server advances simulation from input only.
        const safeDt = Math.max(0, Math.min(decoded.dt, 0.1));
        client.input = inputFlagsToPlayerInput(
          decoded.flags,
          decoded.seq,
          safeDt || FIXED_DT,
          decoded.yaw,
          decoded.pitch,
          decoded.weaponIndex,
        );
        client.lastAckSeq = decoded.seq;
      }

      // Client-originated voxel mutation packets are rejected. A future server
      // weapon simulation will validate and create destruction events here.
      return;
    }

    const now = Date.now();
    if (now - client.messageWindowStart >= 1000) {
      client.messageWindowStart = now;
      client.messagesThisSecond = 0;
    }
    client.messagesThisSecond++;
    if (client.messagesThisSecond > 12) return;

    try {
      const data = JSON.parse(raw.toString());
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', time: Date.now() }));
      } else if (data.type === 'CHAT' && typeof data.text === 'string') {
        const text = data.text.replace(/[\\u0000-\\u001f\\u007f]/g, '').trim().slice(0, 200);
        if (!text) return;
        const chat = JSON.stringify({ type: 'CHAT', sender: client.name, text });
        for (const peer of clients.values()) {
          if (peer.roomId === client.roomId && peer.ws.readyState === WebSocket.OPEN) peer.ws.send(chat);
        }
      }
    } catch {
      // Ignore malformed application messages.
    }
  });

  ws.on('close', () => { clients.delete(clientId); rooms.leave(client.roomId, clientId); });
  ws.on('error', () => { clients.delete(clientId); rooms.leave(client.roomId, clientId); });
});

let serverTick = 0;
let lastTickTime = performance.now();

function simulateServerTick(dt: number) {
  serverTick++;
  for (const client of clients.values()) {
    client.state = {
      ...client.state,
      ...simulatePlayer(
        {
          position: client.state.position,
          velocity: client.state.velocity,
          grounded: client.state.grounded,
        },
        client.input,
        dt,
      ),
    };
  }
}

setInterval(() => {
  const now = performance.now();
  const elapsed = Math.min(0.25, (now - lastTickTime) / 1000);
  lastTickTime = now;

  // Fixed-step server simulation. Never trust client-provided frame time.
  let remaining = elapsed;
  while (remaining >= FIXED_DT) {
    simulateServerTick(FIXED_DT);
    remaining -= FIXED_DT;
  }

  if (clients.size === 0) return;

  for (const client of clients.values()) {
    if (client.ws.readyState !== WebSocket.OPEN) continue;
    const roomPlayers = Array.from(clients.values()).filter(peer => peer.roomId === client.roomId);
    const players = roomPlayers.map(c => ({
      id: c.id,
      name: c.name,
      position: c.state.position,
      velocity: c.state.velocity,
      yaw: c.input.yaw,
      pitch: c.input.pitch,
      health: c.state.health,
      maxHealth: 100,
      armor: c.state.armor,
      maxArmor: 150,
      stateFlags: 0,
      currentWeaponId: c.state.weaponId,
      ammoInClip: c.state.ammoInClip,
      reserveAmmo: c.state.reserveAmmo,
      kills: c.state.kills,
      deaths: c.state.deaths,
      score: c.state.score,
      ping: 0,
      team: c.team,
      isLocal: c.id === client.id,
      ackSeq: c.lastAckSeq,
    }));
    client.ws.send(JSON.stringify({ type: 'SNAPSHOT', tick: serverTick, players }));
  }
}, 1000 / 30);

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true, host: HOST }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => res.sendFile(path.resolve(distPath, 'index.html')));
    }
  }

  server.listen(PORT, HOST, () => {
    console.log(`[BreachPoint] Authoritative server listening on http://${HOST}:${PORT} (prod=${isProduction})`);
  });
}

startServer().catch(err => {
  console.error('[BreachPoint] Fatal startup error:', err);
  process.exitCode = 1;
});
