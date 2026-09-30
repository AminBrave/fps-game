import React, { useRef, useEffect } from 'react';
import { GunshotRadarPing, AirdropState, PlayerState } from '../engine/types';

interface MinimapProps {
  playerPos: [number, number, number];
  playerYaw: number;
  players: PlayerState[];
  gunshotPings: GunshotRadarPing[];
  airdrops: AirdropState[];
}

export const Minimap: React.FC<MinimapProps> = ({
  playerPos,
  playerYaw,
  players,
  gunshotPings,
  airdrops,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const center = width / 2;
    const radarRadius = center - 8;
    const scale = 2.4; // pixels per world meter

    ctx.clearRect(0, 0, width, height);

    // Circular radar clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radarRadius, 0, Math.PI * 2);
    ctx.clip();

    // Radar background
    ctx.fillStyle = '#0a0d10';
    ctx.fillRect(0, 0, width, height);

    // Transform world to rotate around player view direction
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(playerYaw); // Rotate map so player forward is UP

    // 1. Draw Compound Buildings & Obstacles
    ctx.strokeStyle = '#27313a';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#141a21';

    // Outer Perimeter (-24m to 24m)
    const pMin = (-24 - playerPos[0]) * scale;
    const pMaxZ = (-24 - playerPos[2]) * scale;
    const pSize = 48 * scale;
    ctx.strokeRect(pMin, pMaxZ, pSize, pSize);

    // Center Killhouse (-8 to 8, -6 to 6)
    const khX = (-8 - playerPos[0]) * scale;
    const khZ = (-6 - playerPos[2]) * scale;
    ctx.fillRect(khX, khZ, 16 * scale, 12 * scale);
    ctx.strokeRect(khX, khZ, 16 * scale, 12 * scale);

    // Bunker Containers
    const b1X = (-15 - 3 - playerPos[0]) * scale;
    const b1Z = (14 - 4 - playerPos[2]) * scale;
    ctx.fillRect(b1X, b1Z, 6 * scale, 8 * scale);
    ctx.strokeRect(b1X, b1Z, 6 * scale, 8 * scale);

    const b2X = (15 - 3.5 - playerPos[0]) * scale;
    const b2Z = (-14 - 3 - playerPos[2]) * scale;
    ctx.fillRect(b2X, b2Z, 7 * scale, 6 * scale);
    ctx.strokeRect(b2X, b2Z, 7 * scale, 6 * scale);

    // 2. Draw Other Players / Bots
    for (const p of players) {
      if (p.isLocal) continue;
      const px = (p.position[0] - playerPos[0]) * scale;
      const pz = (p.position[2] - playerPos[2]) * scale;

      const isTeammate = p.team === 'spec_ops';
      ctx.beginPath();
      ctx.arc(px, pz, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isTeammate ? '#22c55e' : '#ef4444';
      ctx.shadowColor = isTeammate ? '#22c55e' : '#ef4444';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 3. Draw Gunshot Red Radar Pings
    const now = Date.now();
    for (const ping of gunshotPings) {
      const age = now - ping.timestamp;
      if (age < 3000) {
        const pingX = (ping.x - playerPos[0]) * scale;
        const pingZ = (ping.z - playerPos[2]) * scale;
        const alpha = 1 - age / 3000;

        ctx.beginPath();
        ctx.arc(pingX, pingZ, 5 + (age / 3000) * 10, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.7})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pingX, pingZ, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.fill();
      }
    }

    // 4. Draw Airdrops
    for (const drop of airdrops) {
      const ax = (drop.position[0] - playerPos[0]) * scale;
      const az = (drop.position[2] - playerPos[2]) * scale;

      ctx.fillStyle = drop.opened ? '#888888' : '#f59e0b';
      ctx.fillRect(ax - 4, az - 4, 8, 8);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(ax - 4, az - 4, 8, 8);
    }

    ctx.restore();

    // 5. Radar Rings & Grid (Static on top)
    ctx.strokeStyle = 'rgba(74, 85, 104, 0.4)';
    ctx.lineWidth = 1;

    // 15m and 30m rings
    ctx.beginPath();
    ctx.arc(center, center, 15 * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, 30 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(center, 8);
    ctx.lineTo(center, height - 8);
    ctx.moveTo(8, center);
    ctx.lineTo(width - 8, center);
    ctx.stroke();

    // 6. Local Player Tactical Chevron (Center)
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(center, center - 6);
    ctx.lineTo(center + 5, center + 5);
    ctx.lineTo(center, center + 2);
    ctx.lineTo(center - 5, center + 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore(); // Clip restore

    // Outer border ring
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(center, center, radarRadius, 0, Math.PI * 2);
    ctx.stroke();
  }, [playerPos, playerYaw, players, gunshotPings, airdrops]);

  return (
    <div className="absolute top-4 left-4 z-20 select-none pointer-events-none flex flex-col items-start">
      <div className="relative rounded-full p-1 bg-neutral-950/80 backdrop-blur-md shadow-2xl border border-neutral-800">
        <canvas ref={canvasRef} width={150} height={150} className="rounded-full" />
      </div>

      {/* Tactical Sector HUD Tag */}
      <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-950/80 border border-neutral-800 text-[10px] font-mono tracking-widest text-neutral-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>KILLHOUSE // SECTOR 04</span>
      </div>
    </div>
  );
};
