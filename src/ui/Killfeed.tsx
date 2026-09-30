import React from 'react';
import { KillfeedEntry } from '../engine/types';
import { Crosshair, ShieldAlert } from 'lucide-react';

interface KillfeedProps {
  entries: KillfeedEntry[];
  localPlayerName: string;
}

export const Killfeed: React.FC<KillfeedProps> = ({ entries, localPlayerName }) => {
  const now = Date.now();
  const visibleEntries = entries.filter(e => now - e.timestamp < 5000);

  return (
    <div className="absolute top-16 right-6 flex flex-col items-end gap-1.5 pointer-events-none z-20 select-none">
      {visibleEntries.map(entry => {
        const isLocalKiller = entry.killer === localPlayerName;
        const isLocalVictim = entry.victim === localPlayerName;

        return (
          <div
            key={entry.id}
            className={`flex items-center gap-2 px-2.5 py-1 rounded border backdrop-blur-md shadow-md text-xs font-mono tracking-wide animate-fade-in ${
              isLocalKiller
                ? 'bg-amber-950/80 border-amber-600/70 text-amber-200'
                : isLocalVictim
                ? 'bg-red-950/80 border-red-600/70 text-red-200'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-300'
            }`}
          >
            <span className={`font-bold ${isLocalKiller ? 'text-amber-400' : 'text-neutral-200'}`}>
              {entry.killer}
            </span>

            {/* Weapon Badge */}
            <span className="px-1.5 py-0.5 rounded bg-neutral-950/70 text-[10px] text-neutral-300 border border-neutral-800 uppercase font-semibold">
              {entry.weapon}
            </span>

            {entry.wallbang && (
              <span className="text-amber-400 flex items-center" title="Wall Penetration">
                <ShieldAlert className="w-3.5 h-3.5" />
              </span>
            )}

            {entry.headshot && (
              <span className="text-red-400 flex items-center" title="Headshot">
                <Crosshair className="w-3.5 h-3.5" />
              </span>
            )}

            <span className={`font-bold ${isLocalVictim ? 'text-red-400' : 'text-neutral-400'}`}>
              {entry.victim}
            </span>
          </div>
        );
      })}
    </div>
  );
};
