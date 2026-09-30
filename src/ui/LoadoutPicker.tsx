import React, { useState } from 'react';
import { WeaponConfig, WeaponAttachmentConfig } from '../engine/types';
import { WEAPON_REGISTRY } from '../engine/weapons';
import { Crosshair, Shield, Zap, Sparkles, Check, X } from 'lucide-react';

interface LoadoutPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWeapon: (weapon: WeaponConfig) => void;
  currentWeaponId: string;
}

export const LoadoutPicker: React.FC<LoadoutPickerProps> = ({
  isOpen,
  onClose,
  onSelectWeapon,
  currentWeaponId,
}) => {
  const [selectedId, setSelectedId] = useState<string>(currentWeaponId);
  const [customAttachments, setCustomAttachments] = useState<WeaponAttachmentConfig>(
    WEAPON_REGISTRY[currentWeaponId]?.attachments || WEAPON_REGISTRY.m4a1.attachments
  );

  if (!isOpen) return null;

  const currentWeapon = WEAPON_REGISTRY[selectedId] || WEAPON_REGISTRY.m4a1;

  const handleEquip = () => {
    const updatedWeapon: WeaponConfig = {
      ...currentWeapon,
      attachments: { ...customAttachments },
    };
    onSelectWeapon(updatedWeapon);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-lg z-50 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Crosshair className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-amber-400 font-bold uppercase">
                GUNSMITH ARSENAL
              </span>
              <h2 className="text-xl font-black tracking-wide text-white uppercase">
                CUSTOM LOADOUT SELECTION
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

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left Column: Weapon Catalog (5 cols) */}
          <div className="md:col-span-5 p-4 border-r border-neutral-800/80 space-y-2 bg-neutral-950/40">
            <div className="text-xs font-mono font-bold text-neutral-400 tracking-wider mb-2">
              SELECT PLATFORM
            </div>

            {Object.values(WEAPON_REGISTRY).map((wp) => {
              const isSelected = wp.id === selectedId;

              return (
                <div
                  key={wp.id}
                  onClick={() => {
                    setSelectedId(wp.id);
                    setCustomAttachments(wp.attachments);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase font-mono tracking-wider">
                        {wp.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-amber-300">
                        {wp.category}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-neutral-400 mt-1">
                      {wp.fireRateRPM} RPM • {wp.magSize} RNDS • {wp.penetrationPower}x PEN
                    </div>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-amber-400" />}
                </div>
              );
            })}
          </div>

          {/* Right Column: Gunsmith Inspector & Attachment Builder (7 cols) */}
          <div className="md:col-span-7 p-6 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="text-2xl font-black tracking-wide text-white uppercase">
                    {currentWeapon.name}
                  </h3>
                  <div className="text-xs font-mono text-neutral-400 mt-0.5">
                    MICRO-VOXEL PENETRATION TIER: {currentWeapon.penetrationPower} // BLAST RADIUS:{' '}
                    {currentWeapon.destructionRadius}m
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {currentWeapon.automatic ? 'FULLY AUTOMATIC' : 'SEMI-AUTOMATIC'}
                  </span>
                </div>
              </div>

              {/* Weapon Stats Radar / Bar Breakdown */}
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-neutral-300">
                    <span>DAMAGE PROFILE</span>
                    <span className="font-bold text-amber-400">{currentWeapon.damage} HP</span>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${Math.min(100, (currentWeapon.damage / 120) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-neutral-300">
                    <span>FIRE RATE</span>
                    <span className="font-bold text-amber-400">{currentWeapon.fireRateRPM} RPM</span>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400"
                      style={{ width: `${Math.min(100, (currentWeapon.fireRateRPM / 1000) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-neutral-300">
                    <span>PENETRATION & DESTRUCTION</span>
                    <span className="font-bold text-amber-400">{currentWeapon.destructionRadius}m</span>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400"
                      style={{ width: `${Math.min(100, (currentWeapon.destructionRadius / 3.5) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-neutral-300">
                    <span>ADS SPEED</span>
                    <span className="font-bold text-amber-400">{(currentWeapon.adsSpeed * 1000).toFixed(0)} ms</span>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400"
                      style={{ width: `${Math.min(100, (1 - currentWeapon.adsSpeed / 0.5) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Modular Attachments Customizer */}
              <div className="mt-6 space-y-3">
                <div className="text-xs font-mono font-bold text-neutral-300 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  TACTICAL ATTACHMENTS (GUNSMITH)
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Optic */}
                  <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl">
                    <label className="text-[10px] font-mono text-neutral-400 block mb-1">OPTIC</label>
                    <select
                      value={customAttachments.optic}
                      onChange={(e) =>
                        setCustomAttachments({
                          ...customAttachments,
                          optic: e.target.value as any,
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-700 text-xs font-mono text-white rounded p-1.5 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="iron_sights">Standard Iron Sights</option>
                      <option value="reflex_sight">Viper Reflex Sight (Red Dot)</option>
                      <option value="variable_sniper_scope">Variable Zoom Sniper Scope</option>
                    </select>
                  </div>

                  {/* Barrel */}
                  <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl">
                    <label className="text-[10px] font-mono text-neutral-400 block mb-1">BARREL / MUZZLE</label>
                    <select
                      value={customAttachments.barrel}
                      onChange={(e) =>
                        setCustomAttachments({
                          ...customAttachments,
                          barrel: e.target.value as any,
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-700 text-xs font-mono text-white rounded p-1.5 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="standard">Standard Factory Barrel</option>
                      <option value="tactical_suppressor">Monolithic Suppressor (Stealth)</option>
                      <option value="extended_heavy">Extended Heavy Barrel (+Range)</option>
                    </select>
                  </div>

                  {/* Foregrip */}
                  <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl">
                    <label className="text-[10px] font-mono text-neutral-400 block mb-1">UNDERBARREL GRIP</label>
                    <select
                      value={customAttachments.grip}
                      onChange={(e) =>
                        setCustomAttachments({
                          ...customAttachments,
                          grip: e.target.value as any,
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-700 text-xs font-mono text-white rounded p-1.5 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="none">No Underbarrel Attachment</option>
                      <option value="commando_foregrip">Commando Foregrip (-Recoil)</option>
                      <option value="stippled_grip">Stippled Grip Tape (+Sprint to Fire)</option>
                    </select>
                  </div>

                  {/* Magazine */}
                  <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl">
                    <label className="text-[10px] font-mono text-neutral-400 block mb-1">AMMUNITION / MAG</label>
                    <select
                      value={customAttachments.magazine}
                      onChange={(e) =>
                        setCustomAttachments({
                          ...customAttachments,
                          magazine: e.target.value as any,
                        })
                      }
                      className="w-full bg-neutral-900 border border-neutral-700 text-xs font-mono text-white rounded p-1.5 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="standard">Standard Capacity Magazine</option>
                      <option value="extended_drum">Extended Drum Mag (+Capacity)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 font-mono text-xs hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleEquip}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black font-mono text-xs tracking-wider uppercase transition-all shadow-lg hover:shadow-amber-500/20 cursor-pointer flex items-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current" />
                DEPLOY LOADOUT
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
