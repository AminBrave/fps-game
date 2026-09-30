import React from 'react';
import { WeaponConfig } from '../engine/types';
import { Shield, Crosshair, Bomb, Radio } from 'lucide-react';

interface WeaponHUDProps {
  weapon: WeaponConfig;
  ammoInClip: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  health: number;
  maxHealth: number;
  armor: number; // 0 to 150 (3 bars of 50)
  tacSprintStamina: number; // 0 to 1
  isSliding: boolean;
  isTacSprinting: boolean;
  score: number;
}

export const WeaponHUD: React.FC<WeaponHUDProps> = ({
  weapon,
  ammoInClip,
  reserveAmmo,
  isReloading,
  reloadProgress,
  health,
  maxHealth,
  armor,
  tacSprintStamina,
  isSliding,
  isTacSprinting,
  score,
}) => {
  // Armor plates calculation (3 plates x 50 HP = 150)
  const plateCount = 3;
  const plateHealth = 50;

  return (
    <div className="absolute inset-0 select-none pointer-events-none z-20 overflow-hidden">
      {/* --- Bottom-Left: Operator Health & 3-Plate Armor Bar --- */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-1.5 w-64 md:w-72">
        {/* Tactical Status Tag */}
        <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-neutral-400">
          <span className="flex items-center gap-1 font-bold text-neutral-200">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            OPERATOR STATS
          </span>
          <span className="text-amber-400 font-bold">SCORE: {score}</span>
        </div>

        {/* 3 Segmented Armor Plates */}
        <div className="grid grid-cols-3 gap-1.5 h-2.5">
          {Array.from({ length: plateCount }).map((_, i) => {
            const minArmorForPlate = i * plateHealth;
            const currentPlateArmor = Math.max(0, Math.min(plateHealth, armor - minArmorForPlate));
            const fillPct = (currentPlateArmor / plateHealth) * 100;

            return (
              <div
                key={i}
                className="relative bg-neutral-900/90 border border-neutral-700/60 rounded-sm overflow-hidden"
              >
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-100"
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Health Bar (Red/White) */}
        <div className="relative h-2 bg-neutral-950/90 border border-neutral-800 rounded-sm overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${
              health < 30 ? 'bg-red-600 animate-pulse' : 'bg-neutral-200'
            }`}
            style={{ width: `${(health / maxHealth) * 100}%` }}
          />
        </div>

        {/* Tactical Sprint Stamina */}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] font-mono text-neutral-400 tracking-widest">TAC-SPRINT</span>
          <div className="flex-1 h-1 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
            <div
              className={`h-full transition-all duration-75 ${
                isTacSprinting ? 'bg-amber-400' : 'bg-neutral-400'
              }`}
              style={{ width: `${tacSprintStamina * 100}%` }}
            />
          </div>
          {isSliding && (
            <span className="text-[9px] font-mono font-bold text-amber-400 tracking-wider animate-pulse">
              SLIDING
            </span>
          )}
        </div>
      </div>

      {/* --- Bottom-Right: Weapon Specs, Fire Mode & Ammo Readout --- */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end">
        {/* Reloading Bar */}
        {isReloading && (
          <div className="mb-2 w-48 flex flex-col items-end">
            <span className="text-[10px] font-mono tracking-widest text-amber-400 font-bold mb-0.5 animate-pulse">
              RELOADING...
            </span>
            <div className="w-full h-1.5 bg-neutral-900 border border-amber-500/40 rounded-sm overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-75"
                style={{ width: `${reloadProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-end gap-5 bg-neutral-950/80 backdrop-blur-md px-5 py-3 rounded-lg border border-neutral-800 shadow-2xl">
          {/* Tactical & Lethal Slots */}
          <div className="flex items-center gap-2 border-r border-neutral-800 pr-4">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-8 h-8 rounded bg-neutral-900 border border-neutral-700 flex items-center justify-center text-neutral-300">
                <Bomb className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-mono text-neutral-500">[G] FRAG</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-8 h-8 rounded bg-neutral-900 border border-neutral-700 flex items-center justify-center text-neutral-300">
                <Radio className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-mono text-neutral-500">[4] DROP</span>
            </div>
          </div>

          {/* Weapon Details */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-semibold">
                {weapon.category}
              </span>
              <span className="text-xs font-mono font-bold tracking-wider text-amber-400">
                {weapon.automatic ? 'FULL-AUTO' : 'SEMI-AUTO'}
              </span>
            </div>
            <div className="text-lg md:text-xl font-bold tracking-wider text-white uppercase font-sans mt-0.5">
              {weapon.name}
            </div>
            <div className="text-[10px] font-mono text-neutral-400 tracking-wider">
              ATTACHMENTS: {weapon.attachments.optic.replace('_', ' ')} //{' '}
              {weapon.attachments.barrel.replace('_', ' ')}
            </div>
          </div>

          {/* Massive Modern Warfare Ammo Counter */}
          <div className="flex items-baseline gap-1 font-mono">
            <span
              className={`text-4xl md:text-5xl font-black tracking-tighter ${
                ammoInClip <= Math.ceil(weapon.magSize * 0.25)
                  ? 'text-red-500 animate-pulse'
                  : 'text-white'
              }`}
            >
              {ammoInClip.toString().padStart(2, '0')}
            </span>
            <span className="text-lg text-neutral-500 font-bold">/</span>
            <span className="text-base text-neutral-400 font-semibold">{reserveAmmo}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
