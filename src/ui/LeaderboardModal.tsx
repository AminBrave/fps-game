import React, { useState } from 'react';
import { LeaderboardRecord } from '../engine/types';
import { Trophy, Medal, Search, X, Flame } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: LeaderboardRecord[];
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, records }) => {
  const [filter, setFilter] = useState('');

  if (!isOpen) return null;

  const filtered = records.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-lg z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-amber-400 font-bold uppercase">
                GLOBAL RANKINGS
              </span>
              <h2 className="text-xl font-black tracking-wide text-white uppercase">
                OPERATOR ELO LEADERBOARD
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 bg-neutral-950/50 border-b border-neutral-800/80 flex items-center gap-3">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search operator callsign..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full bg-transparent text-xs font-mono text-white placeholder-neutral-500 focus:outline-none"
          />
        </div>

        {/* Table */}
        <div className="p-4 overflow-y-auto flex-1">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 pb-2">
                <th className="pb-2 pl-3">RANK</th>
                <th className="pb-2">CALLSIGN</th>
                <th className="pb-2 text-center">ELO RATING</th>
                <th className="pb-2 text-center">K/D</th>
                <th className="pb-2 text-center">KILLS</th>
                <th className="pb-2 pr-3 text-right">WIN RATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filtered.map((record, index) => {
                const isTop3 = index < 3;
                return (
                  <tr key={record.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 pl-3 flex items-center gap-1.5 font-bold">
                      {index === 0 && <Medal className="w-4 h-4 text-amber-400" />}
                      {index === 1 && <Medal className="w-4 h-4 text-neutral-300" />}
                      {index === 2 && <Medal className="w-4 h-4 text-amber-700" />}
                      <span className={isTop3 ? 'text-amber-400' : 'text-neutral-500'}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-white flex items-center gap-1.5">
                      <span>{record.name}</span>
                      {record.elo >= 1800 && (
                        <Flame className="w-3.5 h-3.5 text-orange-500 inline-block fill-current" />
                      )}
                    </td>
                    <td className="py-3 text-center text-amber-400 font-bold">{record.elo}</td>
                    <td className="py-3 text-center text-emerald-400 font-bold">{record.kdRatio.toFixed(2)}</td>
                    <td className="py-3 text-center text-neutral-300">{record.kills}</td>
                    <td className="py-3 pr-3 text-right text-neutral-400">
                      {Math.round((record.wins / Math.max(1, record.matchesPlayed)) * 100)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-950 border-t border-neutral-800 text-[10px] font-mono text-neutral-500 flex justify-between">
          <span>RANK RATINGS SYNCED AUTHORITATIVELY VIA SERVER DATABASE</span>
          <span>SEASON 01 // ACTIVE</span>
        </div>
      </div>
    </div>
  );
};
