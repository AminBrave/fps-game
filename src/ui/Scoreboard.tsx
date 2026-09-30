import React from 'react';
import { PlayerState } from '../engine/types';
import { Trophy, Users, Wifi } from 'lucide-react';

interface ScoreboardProps {
  players: PlayerState[];
  isOpen: boolean;
  matchScore: { specOps: number; shadowCompany: number };
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ players, isOpen, matchScore }) => {
  if (!isOpen) return null;

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md z-40 flex items-center justify-center p-6 select-none animate-in fade-in duration-100">
      <div className="w-full max-w-4xl bg-neutral-900/90 border border-neutral-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Match Header */}
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono tracking-widest text-amber-400 font-bold uppercase">
              CLASSIFIED OPERATION // KILLHOUSE WAREHOUSE
            </div>
            <h2 className="text-xl font-black tracking-wide text-white uppercase flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              MATCH SCOREBOARD
            </h2>
          </div>

          {/* Team Score Ticker */}
          <div className="flex items-center gap-6 font-mono">
            <div className="flex flex-col items-center">
              <span className="text-[10px] tracking-wider text-emerald-400 font-bold">SPEC-OPS</span>
              <span className="text-3xl font-black text-emerald-300">{matchScore.specOps}</span>
            </div>
            <span className="text-neutral-600 font-bold text-xl">:</span>
            <div className="flex flex-col items-center">
              <span className="text-[10px] tracking-wider text-red-400 font-bold">SHADOW CO.</span>
              <span className="text-3xl font-black text-red-300">{matchScore.shadowCompany}</span>
            </div>
          </div>
        </div>

        {/* Players Table */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400">
                <th className="pb-2 pl-3">OPERATOR</th>
                <th className="pb-2">FACTION</th>
                <th className="pb-2 text-center">KILLS</th>
                <th className="pb-2 text-center">DEATHS</th>
                <th className="pb-2 text-center">K/D</th>
                <th className="pb-2 text-right">SCORE</th>
                <th className="pb-2 pr-3 text-right">PING</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {sortedPlayers.map((player) => {
                const kd = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toFixed(2);
                const isSpecOps = player.team === 'spec_ops';

                return (
                  <tr
                    key={player.id}
                    className={`hover:bg-neutral-800/40 transition-colors ${
                      player.isLocal ? 'bg-amber-500/10 font-bold' : ''
                    }`}
                  >
                    <td className="py-2.5 pl-3 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSpecOps ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className={player.isLocal ? 'text-amber-400' : 'text-neutral-200'}>
                        {player.name} {player.isLocal && '(YOU)'}
                      </span>
                      {player.isBot && (
                        <span className="text-[9px] px-1 py-0.2 bg-neutral-800 text-neutral-400 rounded">
                          BOT
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <span className={`text-[10px] font-bold ${isSpecOps ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isSpecOps ? 'SPEC-OPS' : 'SHADOW CO.'}
                      </span>
                    </td>
                    <td className="py-2.5 text-center text-white">{player.kills}</td>
                    <td className="py-2.5 text-center text-neutral-400">{player.deaths}</td>
                    <td className="py-2.5 text-center text-amber-300">{kd}</td>
                    <td className="py-2.5 text-right font-bold text-white">{player.score}</td>
                    <td className="py-2.5 pr-3 text-right text-neutral-400">
                      <span className="inline-flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-emerald-400" />
                        {player.ping}ms
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Hint */}
        <div className="px-6 py-2.5 bg-neutral-950 border-t border-neutral-800 text-[10px] font-mono text-neutral-500 flex justify-between">
          <span>HOLD [TAB] TO VIEW SCOREBOARD</span>
          <span>PRESS [ESC] OR [M] FOR LOADOUT GUNSMITH</span>
        </div>
      </div>
    </div>
  );
};
