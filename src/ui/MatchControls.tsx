import React from 'react';
import { Play, Sparkles, Box, RefreshCw, Radio, Trophy, Settings, Users } from 'lucide-react';

interface MatchControlsProps {
  isLocked: boolean;
  onLockPointer: () => void;
  onOpenLoadout: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  onSpawnBot: () => void;
  onTriggerAirdrop: () => void;
  onResetCompound: () => void;
  botCount: number;
}

export const MatchControls: React.FC<MatchControlsProps> = ({
  isLocked,
  onLockPointer,
  onOpenLoadout,
  onOpenLeaderboard,
  onOpenSettings,
  onSpawnBot,
  onTriggerAirdrop,
  onResetCompound,
  botCount,
}) => {
  if (isLocked) {
    return (
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-none">
        <div className="px-3 py-1.5 rounded-lg bg-neutral-950/80 backdrop-blur-md border border-neutral-800 text-[11px] font-mono text-neutral-400 flex items-center gap-2 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>FPS POINTER LOCKED // ESC TO UNLOCK</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-40 flex items-center justify-center p-6 select-none animate-in fade-in duration-100">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col items-center text-center space-y-6">
        {/* Title */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            TACTICAL ENGINE READY
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase font-sans">
            BREACHPOINT: MICRO-VOXEL FPS
          </h1>
          <p className="text-xs md:text-sm font-mono text-neutral-400 max-w-md mx-auto">
            High-speed Call of Duty gunplay, tactical sprint, slide & peak-leaning combined with
            real-time 0.25m destructible micro-voxels.
          </p>
        </div>

        {/* Big Action Button to Resume / Lock Pointer */}
        <button
          onClick={onLockPointer}
          className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black font-mono text-sm tracking-wider uppercase shadow-xl hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer scale-100 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Play className="w-5 h-5 fill-current" />
          ENGAGE OPERATION [CLICK TO LOCK POINTER]
        </button>

        {/* Quick Tactical Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full">
          <button
            onClick={onOpenLoadout}
            className="p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Box className="w-4 h-4 text-amber-400" />
            GUNSMITH [M]
          </button>

          <button
            onClick={onTriggerAirdrop}
            className="p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Radio className="w-4 h-4 text-sky-400" />
            CALL AIRDROP [4]
          </button>

          <button
            onClick={onSpawnBot}
            className="p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            ADD BOT ({botCount}) [B]
          </button>

          <button
            onClick={onResetCompound}
            className="p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-red-400" />
            REBUILD VOXELS [R]
          </button>

          <button
            onClick={onOpenLeaderboard}
            className="p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-yellow-400" />
            LEADERBOARD [L]
          </button>

          <button
            onClick={onOpenSettings}
            className="p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-neutral-400" />
            SETTINGS [O]
          </button>
        </div>

        {/* Tactical Keybinds Cheatsheet */}
        <div className="w-full p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-left">
          <div className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider mb-2">
            OPERATOR TACTICAL CONTROLS CHEATSHEET
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-[11px] font-mono text-neutral-300">
            <div><span className="text-amber-400 font-bold">[W A S D]</span> Tactical Movement</div>
            <div><span className="text-amber-400 font-bold">[Shift]</span> Tactical Sprint</div>
            <div><span className="text-amber-400 font-bold">[C]</span> Slide / Crouch</div>
            <div><span className="text-amber-400 font-bold">[Space]</span> Vault / Jump</div>
            <div><span className="text-amber-400 font-bold">[Q / E]</span> Tactical Peak-Lean</div>
            <div><span className="text-amber-400 font-bold">[RMB]</span> Aim-Down-Sights (ADS)</div>
            <div><span className="text-amber-400 font-bold">[LMB]</span> Fire Weapon</div>
            <div><span className="text-amber-400 font-bold">[R]</span> Reload Magazine</div>
            <div><span className="text-amber-400 font-bold">[1 2 3 4]</span> Switch Loadout</div>
            <div><span className="text-amber-400 font-bold">[Tab]</span> Hold for Scoreboard</div>
            <div><span className="text-amber-400 font-bold">[M]</span> Gunsmith Loadout</div>
            <div><span className="text-amber-400 font-bold">[Esc]</span> Pause / Menu</div>
          </div>
        </div>
      </div>
    </div>
  );
};
