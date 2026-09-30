import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// In-Memory Leaderboard Database
interface ServerLeaderboardRecord {
  id: string;
  name: string;
  elo: number;
  kills: number;
  deaths: number;
  kdRatio: number;
  matchesPlayed: number;
  wins: number;
  lastActive: string;
}

const LEADERBOARD_DATA: ServerLeaderboardRecord[] = [
  { id: '1', name: 'Ghost_MW2', elo: 2420, kills: 1420, deaths: 420, kdRatio: 3.38, matchesPlayed: 85, wins: 72, lastActive: 'Just now' },
  { id: '2', name: 'Soap_MacTavish', elo: 2280, kills: 1190, deaths: 480, kdRatio: 2.47, matchesPlayed: 74, wins: 58, lastActive: '5m ago' },
  { id: '3', name: 'CaptainPrice', elo: 2150, kills: 980, deaths: 410, kdRatio: 2.39, matchesPlayed: 62, wins: 49, lastActive: '12m ago' },
  { id: '4', name: 'Roach_Specialist', elo: 1980, kills: 840, deaths: 460, kdRatio: 1.82, matchesPlayed: 55, wins: 38, lastActive: '25m ago' },
  { id: '5', name: 'Gaz_SAS', elo: 1840, kills: 710, deaths: 420, kdRatio: 1.69, matchesPlayed: 48, wins: 31, lastActive: '1h ago' },
  { id: '6', name: 'Alejandro_Vargas', elo: 1720, kills: 560, deaths: 390, kdRatio: 1.43, matchesPlayed: 40, wins: 24, lastActive: '2h ago' },
];

// --- REST Endpoints ---
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', matchServer: 'BreachPoint Authoritative Node', tickRate: 30 });
});

app.get('/api/leaderboard', (req: Request, res: Response) => {
  res.json(LEADERBOARD_DATA);
});

app.post('/api/auth/token', (req: Request, res: Response) => {
  const { username } = req.body || { username: 'Operator_' + Math.floor(Math.random() * 1000) };
  res.json({
    token: `jwt_bp_${Date.now()}_${Math.random().toString(36).substring(2)}`,
    user: { id: `usr_${Date.now()}`, name: username, elo: 1500 },
  });
});

// --- WebSocket Authoritative Match Server ---
const wss = new WebSocketServer({ server, path: '/ws' });

interface ConnectedClient {
  ws: WebSocket;
  id: string;
  name: string;
  posX: number;
  posY: number;
  posZ: number;
  yaw: number;
  pitch: number;
  lastAckSeq: number;
  health: number;
  armor: number;
  score: number;
  kills: number;
  deaths: number;
  team: 'spec_ops' | 'shadow_company';
  lastPingTime: number;
}

const clients = new Map<string, ConnectedClient>();

wss.on('connection', (ws: WebSocket) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const team = clients.size % 2 === 0 ? 'spec_ops' : 'shadow_company';

  const client: ConnectedClient = {
    ws,
    id: clientId,
    name: `Operator_${clientId.substring(14)}`,
    posX: (Math.random() - 0.5) * 20,
    posY: 1.0,
    posZ: (Math.random() - 0.5) * 20,
    yaw: 0,
    pitch: 0,
    lastAckSeq: 0,
    health: 100,
    armor: 100,
    score: 0,
    kills: 0,
    deaths: 0,
    team,
    lastPingTime: Date.now(),
  };

  clients.set(clientId, client);

  // Send initialization info
  ws.send(JSON.stringify({
    type: 'INIT',
    clientId,
    team,
    message: 'Connected to BreachPoint Authoritative Server',
  }));

  ws.on('message', (message: any) => {
    if (Buffer.isBuffer(message) || message instanceof ArrayBuffer) {
      const view = Buffer.isBuffer(message)
        ? new DataView(message.buffer, message.byteOffset, message.byteLength)
        : new DataView(message);
      const byteLength = Buffer.isBuffer(message) ? message.byteLength : message.byteLength;
      const packetType = view.getUint8(0);

      // PacketType 1: Movement Input (24 bytes)
      if (packetType === 1 && byteLength >= 24) {
        const seq = view.getUint16(2, true);
        const x = view.getInt16(8, true) / 100;
        const y = view.getInt16(10, true) / 100;
        const z = view.getInt16(12, true) / 100;
        const yaw = (view.getInt16(14, true) / 32767) * Math.PI;
        const pitch = (view.getInt16(16, true) / 32767) * (Math.PI / 2);

        // Basic anti-cheat speed sanity check
        const maxMoveStep = 3.0;
        const dist = Math.hypot(x - client.posX, z - client.posZ);
        if (dist <= maxMoveStep) {
          client.posX = x;
          client.posY = y;
          client.posZ = z;
        }

        client.yaw = yaw;
        client.pitch = pitch;
        client.lastAckSeq = seq;
      }
      // PacketType 3: Voxel Destruction Delta
      else if (packetType === 3) {
        // Broadcast destruction delta to all other clients
        for (const [id, peer] of clients.entries()) {
          if (id !== clientId && peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.send(message);
          }
        }
      }
    } else {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', time: Date.now() }));
        } else if (data.type === 'CHAT') {
          // Broadcast chat to all clients
          const chatMsg = JSON.stringify({ type: 'CHAT', sender: client.name, text: data.text });
          for (const peer of clients.values()) {
            if (peer.ws.readyState === WebSocket.OPEN) {
              peer.ws.send(chatMsg);
            }
          }
        }
      } catch {
        // ignore malformed
      }
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
  });
});

// Authoritative Match Tick Loop (30Hz)
let serverTick = 0;
setInterval(() => {
  serverTick++;
  if (clients.size === 0) return;

  const snapshot = {
    type: 'SNAPSHOT',
    tick: serverTick,
    players: Array.from(clients.values()).map(c => ({
      id: c.id,
      name: c.name,
      position: [c.posX, c.posY, c.posZ],
      yaw: c.yaw,
      pitch: c.pitch,
      health: c.health,
      armor: c.armor,
      score: c.score,
      kills: c.kills,
      deaths: c.deaths,
      team: c.team,
      isLocal: false,
    })),
  };

  const payload = JSON.stringify(snapshot);
  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}, 1000 / 30);

// --- Vite / Static Files Mounting ---
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  server.listen(PORT, () => {
    console.log(`[BreachPoint] Match Server listening on port ${PORT} (prod=${isProduction})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start BreachPoint server:', err);
});
