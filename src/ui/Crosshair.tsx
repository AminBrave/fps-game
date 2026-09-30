import React from 'react';

interface CrosshairProps {
  isADS: boolean;
  spread: number; // e.g. 10 to 45 px
  isFiring: boolean;
}

export const Crosshair: React.FC<CrosshairProps> = ({ isADS, spread, isFiring }) => {
  if (isADS) return null; // In ADS, crosshair disappears for optic/iron sight

  const currentGap = spread + (isFiring ? 8 : 0);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 select-none">
      {/* Center Sub-pixel Dot */}
      <div className="w-1.5 h-1.5 bg-white/90 rounded-full shadow-[0_0_4px_rgba(255,255,255,0.8)]" />

      {/* Top Crosshair Bar */}
      <div
        className="absolute w-[2px] h-3.5 bg-white/85 shadow-[0_0_2px_#000] rounded-sm transition-all duration-75"
        style={{ transform: `translateY(-${currentGap}px)` }}
      />
      {/* Bottom Crosshair Bar */}
      <div
        className="absolute w-[2px] h-3.5 bg-white/85 shadow-[0_0_2px_#000] rounded-sm transition-all duration-75"
        style={{ transform: `translateY(${currentGap}px)` }}
      />
      {/* Left Crosshair Bar */}
      <div
        className="absolute h-[2px] w-3.5 bg-white/85 shadow-[0_0_2px_#000] rounded-sm transition-all duration-75"
        style={{ transform: `translateX(-${currentGap}px)` }}
      />
      {/* Right Crosshair Bar */}
      <div
        className="absolute h-[2px] w-3.5 bg-white/85 shadow-[0_0_2px_#000] rounded-sm transition-all duration-75"
        style={{ transform: `translateX(${currentGap}px)` }}
      />
    </div>
  );
};
