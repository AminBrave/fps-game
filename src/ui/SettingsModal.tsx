import React from 'react';
import { Settings, X, Volume2, Eye, MousePointer } from 'lucide-react';
import { soundEngine } from '../engine/audio';

export interface GameSettings {
  mouseSensitivity: number;
  adsSensitivityMultiplier: number;
  fov: number;
  volume: number;
  invertY: boolean;
  shadows: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handleChange = (key: keyof GameSettings, val: any) => {
    const updated = { ...settings, [key]: val };
    onUpdateSettings(updated);
    if (key === 'volume') {
      soundEngine.setVolume(val);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-lg z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-amber-400 font-bold uppercase">
                SYSTEM CONFIGURATION
              </span>
              <h2 className="text-xl font-black tracking-wide text-white uppercase">
                SETTINGS & CONTROLS
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

        {/* Settings Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Mouse Sensitivity */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono text-neutral-300">
              <span className="flex items-center gap-1.5 font-bold">
                <MousePointer className="w-3.5 h-3.5 text-amber-400" />
                MOUSE SENSITIVITY
              </span>
              <span className="text-amber-400 font-bold">{settings.mouseSensitivity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.05"
              value={settings.mouseSensitivity}
              onChange={e => handleChange('mouseSensitivity', parseFloat(e.target.value))}
              className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* ADS Sensitivity Multiplier */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono text-neutral-300">
              <span className="font-bold">ADS SENSITIVITY MULTIPLIER</span>
              <span className="text-amber-400 font-bold">{settings.adsSensitivityMultiplier.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.5"
              step="0.05"
              value={settings.adsSensitivityMultiplier}
              onChange={e => handleChange('adsSensitivityMultiplier', parseFloat(e.target.value))}
              className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Field of View (FOV) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono text-neutral-300">
              <span className="flex items-center gap-1.5 font-bold">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                FIELD OF VIEW (FOV)
              </span>
              <span className="text-amber-400 font-bold">{settings.fov}°</span>
            </div>
            <input
              type="range"
              min="65"
              max="110"
              step="1"
              value={settings.fov}
              onChange={e => handleChange('fov', parseInt(e.target.value))}
              className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Master Volume */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono text-neutral-300">
              <span className="flex items-center gap-1.5 font-bold">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                MASTER SOUND VOLUME
              </span>
              <span className="text-amber-400 font-bold">{Math.round(settings.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={e => handleChange('volume', parseFloat(e.target.value))}
              className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Invert Y */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
            <span className="text-xs font-mono font-bold text-neutral-300">INVERT VERTICAL LOOK (Y-AXIS)</span>
            <input
              type="checkbox"
              checked={settings.invertY}
              onChange={e => handleChange('invertY', e.target.checked)}
              className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
            />
          </div>

          {/* Dynamic Shadows */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
            <div>
              <span className="text-xs font-mono font-bold text-neutral-300 block">DYNAMIC DIRECTIONAL SHADOWS</span>
              <span className="text-[10px] font-mono text-neutral-500">Improves PBR graphics realism</span>
            </div>
            <input
              type="checkbox"
              checked={settings.shadows}
              onChange={e => handleChange('shadows', e.target.checked)}
              className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-950 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black font-mono text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer"
          >
            CONFIRM & RETURN
          </button>
        </div>
      </div>
    </div>
  );
};
