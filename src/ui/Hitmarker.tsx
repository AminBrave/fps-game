import React from 'react';
import { HitmarkerEvent } from '../engine/types';
import { ShieldAlert, Skull } from 'lucide-react';

interface HitmarkerProps {
  events: HitmarkerEvent[];
}

export const Hitmarker: React.FC<HitmarkerProps> = ({ events }) => {
  const now = Date.now();
  const recent = events.filter(e => now - e.timestamp < 320);

  if (recent.length === 0) return null;
  const latest = recent[recent.length - 1];

  const isKill = latest.type === 'kill';
  const isHeadshot = latest.type === 'headshot';
  const isArmorBreak = latest.type === 'armor_break';

  const markerColor = isKill
    ? 'text-red-500 stroke-red-500'
    : isHeadshot
    ? 'text-amber-400 stroke-amber-400'
    : 'text-white stroke-white';

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 select-none">
      {/* 4 Diagonal Call of Duty Hit Ticks */}
      <div className="relative w-12 h-12 flex items-center justify-center animate-ping duration-75">
        <svg
          viewBox="0 0 48 48"
          className={`w-10 h-10 ${markerColor} transition-transform duration-75`}
          style={{
            filter: isKill
              ? 'drop-shadow(0 0 6px rgba(239,68,68,0.9))'
              : 'drop-shadow(0 0 4px rgba(255,255,255,0.7))',
          }}
        >
          {/* Top-Left Tick */}
          <line x1="16" y1="16" x2="8" y2="8" strokeWidth="2.5" strokeLinecap="square" />
          {/* Top-Right Tick */}
          <line x1="32" y1="16" x2="40" y2="8" strokeWidth="2.5" strokeLinecap="square" />
          {/* Bottom-Left Tick */}
          <line x1="16" y1="32" x2="8" y2="40" strokeWidth="2.5" strokeLinecap="square" />
          {/* Bottom-Right Tick */}
          <line x1="32" y1="32" x2="40" y2="40" strokeWidth="2.5" strokeLinecap="square" />
        </svg>

        {/* Elimination Skull Icon */}
        {isKill && (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 animate-bounce">
            <Skull className="w-6 h-6 stroke-[2.5] drop-shadow-[0_0_8px_rgba(239,68,68,1)]" />
          </div>
        )}

        {/* Armor Break Shield Icon */}
        {isArmorBreak && (
          <div className="absolute inset-0 flex items-center justify-center text-cyan-400 animate-pulse">
            <ShieldAlert className="w-6 h-6 stroke-[2.5] drop-shadow-[0_0_8px_rgba(34,211,238,1)]" />
          </div>
        )}
      </div>

      {/* Floating Combat Damage Digits */}
      <div className="absolute -top-10 flex flex-col items-center">
        {recent.map(e => (
          <div
            key={e.id}
            className={`font-mono font-black text-sm tracking-widest drop-shadow-md ${
              e.type === 'kill'
                ? 'text-red-400 text-base scale-110'
                : e.type === 'headshot'
                ? 'text-amber-300'
                : e.type === 'armor_break'
                ? 'text-cyan-300'
                : 'text-white'
            }`}
          >
            -{Math.round(e.damage)}
            {e.type === 'headshot' && ' [CRIT]'}
            {e.type === 'kill' && ' [CONFIRMED]'}
          </div>
        ))}
      </div>
    </div>
  );
};
