/**
 * BreachPoint Tactical Pre-Game Staging Lobby
 * Interactive 3D Gunsmith Turntable, Bot Roster & AI Difficulty Customizer,
 * Real-World Ballistics Toggles, Audio/Graphics Sliders, and Match Deploy Trigger.
 */

import React, { useState } from 'react';
import {
  Crosshair,
  Shield,
  Sliders,
  Play,
  RotateCw,
  Cpu,
  Eye,
  Radio,
  Volume2,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
  Check,
  Zap,
} from 'lucide-react';
import { WeaponConfig } from '../engine/types';
import { WEAPON_REGISTRY } from '../engine/weapons';

export interface MatchSettings {
  enableBots: boolean;
  botCount: number; // 0 to 8
  aiDifficulty: 'recruit' | 'regular' | 'hardened' | 'veteran';
  friendlyFire: boolean;
  enableHitmarkers: boolean;
  enableMinimap: boolean;
  enableAirdrops: boolean;
  highPrecisionBallistics: boolean;
  shadowQuality: 'low' | 'medium' | 'high';
  particleDensity: 'low' | 'high';
  volumetricFog: boolean;
  soundVolume: number;
}

export type CamoType = 'factory' | 'urban_digital' | 'od_green' | 'carbon_fiber' | 'desert_splinter' | 'gold_damascus';

interface LobbyProps {
  currentWeapon: WeaponConfig;
  onSelectWeapon: (weapon: WeaponConfig) => void;
  onUpdateAttachments: (attachments: WeaponConfig['attachments']) => void;
  camo: CamoType;
  onSelectCamo: (camo: CamoType) => void;
  matchSettings: MatchSettings;
  onUpdateMatchSettings: (settings: MatchSettings) => void;
  onDeployMatch: () => void;
  rooms?: Array<{id:string; map:string; weather:string; botCount:number; maxPlayers:number; playerCount:number}>;
  onCreateRoom?: () => void;
  onJoinRoom?: (roomId:string) => void;
}

const CAMO_OPTIONS: { id: CamoType; name: string; color: string; desc: string }[] = [
  { id: 'factory', name: 'Factory Gunmetal', color: '#2a2e33', desc: 'Standard matte parkerized finish' },
  { id: 'urban_digital', name: 'Urban Digital', color: '#54606e', desc: 'Tactical pixelated low-vis urban gray' },
  { id: 'od_green', name: 'Matte OD Green', color: '#445138', desc: 'Special forces woodland anti-reflective coating' },
  { id: 'carbon_fiber', name: 'Carbon Fiber', color: '#1a1c1e', desc: 'Lightweight reinforced woven carbon weave' },
  { id: 'desert_splinter', name: 'Desert Splinter', color: '#8a7755', desc: 'High-contrast arid compound splinter camouflage' },
  { id: 'gold_damascus', name: 'Gold Damascus', color: '#c99a38', desc: 'Folded steel mastercraft with gilded finish' },
];

export const Lobby: React.FC<LobbyProps> = ({
  currentWeapon,
  onSelectWeapon,
  onUpdateAttachments,
  camo,
  onSelectCamo,
  matchSettings,
  onUpdateMatchSettings,
  onDeployMatch,
  rooms = [],
  onCreateRoom,
  onJoinRoom,
}) => {
  const [activeTab, setActiveTab] = useState<'gunsmith' | 'match_rules' | 'video_audio'>('gunsmith');

  const weaponList = Object.values(WEAPON_REGISTRY);

  const handleAttachmentChange = (key: keyof WeaponConfig['attachments'], val: string) => {
    onUpdateAttachments({
      ...currentWeapon.attachments,
      [key]: val,
    });
  };

  const updateSetting = <K extends keyof MatchSettings>(key: K, value: MatchSettings[K]) => {
    onUpdateMatchSettings({
      ...matchSettings,
      [key]: value,
    });
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-6 pointer-events-auto bg-gradient-to-t from-black/90 via-black/40 to-black/80 font-sans select-none overflow-hidden">
      {/* Top Tactical Status Bar */}
      <div className="flex items-center justify-between border-b border-zinc-700/60 pb-4 backdrop-blur-md px-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/40 rounded">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-amber-400 font-mono text-xs tracking-widest font-semibold uppercase">
              STAGING DOCK: SECTOR 4
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-wider text-zinc-100 uppercase">
            BREACH<span className="text-amber-500">POINT</span>
          </h1>
          <span className="text-xs text-zinc-400 font-mono">v1.2 // MICRO-VOXEL TACTICAL FPS</span>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-zinc-900/80 border border-zinc-700/60 rounded-md p-1 gap-1">
          <button
            onClick={() => setActiveTab('gunsmith')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase rounded transition-all ${
              activeTab === 'gunsmith'
                ? 'bg-amber-500 text-black shadow-lg font-bold'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            Gunsmith Armory
          </button>
          <button
            onClick={() => setActiveTab('match_rules')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase rounded transition-all ${
              activeTab === 'match_rules'
                ? 'bg-amber-500 text-black shadow-lg font-bold'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Match & Bot Rules
          </button>
          <button
            onClick={() => setActiveTab('video_audio')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wider uppercase rounded transition-all ${
              activeTab === 'video_audio'
                ? 'bg-amber-500 text-black shadow-lg font-bold'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Graphics & Audio
          </button>
        </div>
      </div>

      {/* Main Center Area: Left Workbench Customizer + Turntable Center View */}
      <div className="flex-1 flex gap-6 my-4 overflow-hidden">
        {/* Left Side: Dynamic Tab Content */}
        <div className="w-[420px] flex flex-col bg-zinc-950/85 border border-zinc-800/80 rounded-xl p-5 backdrop-blur-xl shadow-2xl overflow-y-auto">
          {activeTab === 'gunsmith' && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-sm font-mono tracking-widest text-amber-400 uppercase mb-3 flex items-center gap-2">
                  <Crosshair className="w-4 h-4" /> Primary Weapon Selection
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {weaponList.map(w => {
                    const isSelected = w.id === currentWeapon.id;
                    return (
                      <button
                        key={w.id}
                        onClick={() => onSelectWeapon(w)}
                        className={`text-left p-3 rounded border transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-white'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                        }`}
                      >
                        <div className="text-xs font-mono uppercase text-amber-500/80">{w.category}</div>
                        <div className="text-sm font-bold tracking-wide">{w.name.split(' ')[0]}</div>
                        <div className="text-[11px] text-zinc-400 mt-1">
                          {w.damage} DMG • {w.fireRateRPM} RPM
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weapon Telemetry Readout */}
              <div className="bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-lg flex flex-col gap-2 font-mono text-xs">
                <div className="flex justify-between text-zinc-300">
                  <span className="text-zinc-400">Caliber / Ballistics:</span>
                  <span className="text-amber-400 font-semibold">
                    {currentWeapon.category === 'AR' && '5.56x45mm NATO (High Velocity)'}
                    {currentWeapon.category === 'SMG' && '9x19mm Parabellum (CQC High-Rate)'}
                    {currentWeapon.category === 'SNIPER' && '7.92x57mm Mauser (Heavy Armor-Piercing)'}
                    {currentWeapon.category === 'PISTOL' && '.50 Action Express (Heavy Magnum)'}
                    {currentWeapon.category === 'LAUNCHER' && '85mm High-Explosive Anti-Tank'}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span className="text-zinc-400">Muzzle Velocity:</span>
                  <span>{currentWeapon.bulletSpeed} m/s</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span className="text-zinc-400">Voxel Breaching Power:</span>
                  <div className="flex gap-1 items-center">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-sm ${
                          i < currentWeapon.penetrationPower ? 'bg-amber-400' : 'bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Camouflage Finishes */}
              <div>
                <h3 className="text-xs font-mono tracking-widest text-zinc-400 uppercase mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Camouflage Finish
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {CAMO_OPTIONS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => onSelectCamo(c.id)}
                      className={`flex flex-col items-center p-2 rounded border text-center transition-all ${
                        camo === c.id
                          ? 'border-amber-400 bg-amber-500/10'
                          : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded border border-zinc-700 mb-1.5 shadow-inner"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-[11px] font-semibold text-zinc-200">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tactical Attachments */}
              <div>
                <h3 className="text-xs font-mono tracking-widest text-zinc-400 uppercase mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" /> Tactical Attachments
                </h3>
                <div className="space-y-3">
                  {/* Optic */}
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">OPTIC SYSTEM</label>
                    <select
                      value={currentWeapon.attachments.optic}
                      onChange={e => handleAttachmentChange('optic', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-400"
                    >
                      <option value="iron_sights">Standard Combat Iron Sights</option>
                      <option value="reflex_sight">Operator Reflex Red Dot Sight</option>
                      <option value="variable_sniper_scope">4x-8x Variable High-Zoom Scope</option>
                    </select>
                  </div>

                  {/* Muzzle Device */}
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">MUZZLE DEVICE</label>
                    <select
                      value={currentWeapon.attachments.barrel}
                      onChange={e => handleAttachmentChange('barrel', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-400"
                    >
                      <option value="standard">Standard Muzzle Brake</option>
                      <option value="tactical_suppressor">Tactical Suppressor (Silent Radar / Reduced Flash)</option>
                      <option value="extended_heavy">Extended Heavy Barrel (FMJ Penetration Bonus)</option>
                    </select>
                  </div>

                  {/* Underbarrel Foregrip */}
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">UNDERBARREL FOREGRIP</label>
                    <select
                      value={currentWeapon.attachments.grip}
                      onChange={e => handleAttachmentChange('grip', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-400"
                    >
                      <option value="none">No Attachment</option>
                      <option value="commando_foregrip">Commando Foregrip (Recoil Stabilization)</option>
                      <option value="stippled_grip">Stippled Grip Tape (Faster Sprint-to-Fire)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'match_rules' && (
            <div className="flex flex-col gap-5">
              <h2 className="text-sm font-mono tracking-widest text-amber-400 uppercase flex items-center gap-2">
                <Cpu className="w-4 h-4" /> AI Tactical Bot Controls
              </h2>

              {/* Bot Toggle */}
              <div className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Autonomous Squad Bots</div>
                  <div className="text-[11px] text-zinc-400">Spawn intelligent tactical combatants in the killhouse</div>
                </div>
                <input
                  type="checkbox"
                  checked={matchSettings.enableBots}
                  onChange={e => updateSetting('enableBots', e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {/* Bot Density Slider */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-300">Bot Squad Count:</span>
                  <span className="text-amber-400 font-bold">{matchSettings.botCount} Bots</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={8}
                  value={matchSettings.botCount}
                  disabled={!matchSettings.enableBots}
                  onChange={e => updateSetting('botCount', parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                  <span>Solo / Target</span>
                  <span>4 (Tactical Default)</span>
                  <span>8 (Maximum Chaos)</span>
                </div>
              </div>

              {/* AI Difficulty */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2">
                <label className="text-xs font-mono text-zinc-300 block">AI TACTICAL DIFFICULTY</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['recruit', 'regular', 'hardened', 'veteran'] as const).map(diff => (
                    <button
                      key={diff}
                      onClick={() => updateSetting('aiDifficulty', diff)}
                      className={`px-3 py-2 rounded text-xs font-semibold uppercase border transition-all ${
                        matchSettings.aiDifficulty === diff
                          ? 'bg-amber-500 text-black border-amber-400 font-bold'
                          : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Match Rules & Events */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-mono tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Match Environment Toggles
                </h3>

                <div className="flex items-center justify-between p-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded">
                  <span className="text-xs text-zinc-300">Dynamic Parachute Airdrops</span>
                  <input
                    type="checkbox"
                    checked={matchSettings.enableAirdrops}
                    onChange={e => updateSetting('enableAirdrops', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded">
                  <span className="text-xs text-zinc-300">Radar Minimap Navigation</span>
                  <input
                    type="checkbox"
                    checked={matchSettings.enableMinimap}
                    onChange={e => updateSetting('enableMinimap', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-zinc-900/40 border border-zinc-800/80 rounded">
                  <span className="text-xs text-zinc-300">Real-World Ballistic Deflection</span>
                  <input
                    type="checkbox"
                    checked={matchSettings.highPrecisionBallistics}
                    onChange={e => updateSetting('highPrecisionBallistics', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'video_audio' && (
            <div className="flex flex-col gap-5">
              <h2 className="text-sm font-mono tracking-widest text-amber-400 uppercase flex items-center gap-2">
                <Sliders className="w-4 h-4" /> Graphics & Performance Tuning
              </h2>

              {/* Shadow Quality */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2">
                <label className="text-xs font-mono text-zinc-300 block">DYNAMIC DIRECTIONAL SHADOWS</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map(sq => (
                    <button
                      key={sq}
                      onClick={() => updateSetting('shadowQuality', sq)}
                      className={`px-3 py-1.5 rounded text-xs font-semibold uppercase border transition-all ${
                        matchSettings.shadowQuality === sq
                          ? 'bg-amber-500 text-black border-amber-400 font-bold'
                          : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              </div>

              {/* Particle Density */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2">
                <label className="text-xs font-mono text-zinc-300 block">MICRO-VOXEL DEBRIS DENSITY</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['low', 'high'] as const).map(pd => (
                    <button
                      key={pd}
                      onClick={() => updateSetting('particleDensity', pd)}
                      className={`px-3 py-1.5 rounded text-xs font-semibold uppercase border transition-all ${
                        matchSettings.particleDensity === pd
                          ? 'bg-amber-500 text-black border-amber-400 font-bold'
                          : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {pd === 'high' ? 'High (60-150 Debris)' : 'Performance (30 Debris)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volumetric Fog */}
              <div className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Atmospheric Warehouse Fog</div>
                  <div className="text-[11px] text-zinc-400">Volumetric dust motes and depth haze</div>
                </div>
                <input
                  type="checkbox"
                  checked={matchSettings.volumetricFog}
                  onChange={e => updateSetting('volumetricFog', e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {/* Sound Volume Slider */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-300">Tactical SFX Master Volume:</span>
                  <span className="text-amber-400 font-bold">{Math.round(matchSettings.soundVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={matchSettings.soundVolume}
                  onChange={e => updateSetting('soundVolume', parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Center/Right: 3D Turntable Inspection Prompt Overlay */}
        <div className="flex-1 flex flex-col justify-end p-6 pointer-events-none">
          <div className="max-w-md bg-zinc-950/70 border border-zinc-800/80 p-4 rounded-xl backdrop-blur-md">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase mb-1">
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              <span>Interactive Turntable Active</span>
            </div>
            <p className="text-xs text-zinc-400">
              Left-click & drag on 3D view to inspect weapon profile and attachments. Real-time PBR lighting and material finishes update live.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Action Ribbon: Match Deployment */}
      <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4 px-2">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>RAPIER PHYSICS: WASM AUTHORITATIVE</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
            <span>NETWORKING: WEBRTC / UDP READY</span>
          </div>
        </div>

        {/* Big Tactical Deploy Button */}
        <button
          onClick={onDeployMatch}
          className="group relative flex items-center gap-3 px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm tracking-widest uppercase rounded-lg shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>DEPLOY TO MATCH [SPACE]</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};
