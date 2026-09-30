import React, { useMemo } from 'react';
import { GunshotRadarPing } from '../engine/types';

interface CompassProps {
  yaw: number; // in radians
  gunshotPings: GunshotRadarPing[];
  playerPos: [number, number, number];
}

export const Compass: React.FC<CompassProps> = ({ yaw, gunshotPings, playerPos }) => {
  // Convert yaw radians to degrees (0 to 360)
  const deg = useMemo(() => {
    let d = ((-yaw * 180) / Math.PI) % 360;
    if (d < 0) d += 360;
    return Math.round(d);
  }, [yaw]);

  // Compute bearing pings for recent gunshots (within last 3 seconds)
  const activePings = useMemo(() => {
    const now = Date.now();
    return gunshotPings
      .filter(p => now - p.timestamp < 3200)
      .map(p => {
        const dx = p.x - playerPos[0];
        const dz = p.z - playerPos[2];
        let angleToEnemy = (Math.atan2(dx, dz) * 180) / Math.PI;
        if (angleToEnemy < 0) angleToEnemy += 360;

        // Relative angle to player facing heading
        let relAngle = angleToEnemy - deg;
        while (relAngle < -180) relAngle += 360;
        while (relAngle > 180) relAngle -= 360;

        return {
          id: p.id,
          relAngle,
          opacity: 1 - (now - p.timestamp) / 3200,
        };
      })
      .filter(p => Math.abs(p.relAngle) <= 60); // In 120° forward compass view
  }, [gunshotPings, playerPos, deg]);

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[340px] md:w-[480px] select-none pointer-events-none z-20 flex flex-col items-center">
      {/* Center Reticle Triangle */}
      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] z-10" />

      {/* Compass Ribbon Container */}
      <div className="relative w-full h-8 overflow-hidden rounded border border-neutral-700/60 bg-neutral-950/70 backdrop-blur-md shadow-2xl flex items-center justify-center">
        {/* Subtle grid lines */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:8px_8px]" />

        {/* Sliding Ribbon */}
        <div
          className="absolute flex items-center h-full whitespace-nowrap transition-transform duration-75"
          style={{ transform: `translateX(${-((deg % 360) * 4)}px)` }}
        >
          {/* Render 3 repetitions for seamless wrap */}
          {[-360, 0, 360].map(offset => (
            <div key={offset} className="flex items-center">
              {Array.from({ length: 72 }).map((_, i) => {
                const angle = i * 5;
                const isCardinal = angle % 90 === 0;
                const isOrdinal = angle % 45 === 0 && !isCardinal;
                const isMajor = angle % 15 === 0;

                let label = '';
                if (angle === 0) label = 'N';
                else if (angle === 45) label = 'NE';
                else if (angle === 90) label = 'E';
                else if (angle === 135) label = 'SE';
                else if (angle === 180) label = 'S';
                else if (angle === 225) label = 'SW';
                else if (angle === 270) label = 'W';
                else if (angle === 315) label = 'NW';
                else if (isMajor) label = `${angle}`;

                return (
                  <div
                    key={angle}
                    className="flex flex-col items-center justify-center"
                    style={{ width: '20px' }}
                  >
                    {label ? (
                      <span
                        className={`text-[10px] font-mono font-bold tracking-wider leading-none mb-0.5 ${
                          isCardinal
                            ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                            : isOrdinal
                            ? 'text-neutral-200'
                            : 'text-neutral-400 text-[8px]'
                        }`}
                      >
                        {label}
                      </span>
                    ) : (
                      <div
                        className={`w-[1px] ${
                          isMajor ? 'h-2.5 bg-neutral-400' : 'h-1.5 bg-neutral-600'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Gunshot Directional Red Indicators */}
        {activePings.map(ping => (
          <div
            key={ping.id}
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{
              left: `calc(50% + ${ping.relAngle * 3.6}px)`,
              opacity: ping.opacity,
            }}
          >
            <div className="w-2.5 h-2.5 bg-red-600 rotate-45 border border-red-300 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Heading Digits */}
      <div className="mt-1 font-mono text-[11px] font-bold text-neutral-300 tracking-widest bg-neutral-900/80 px-2 py-0.5 rounded border border-neutral-800">
        {deg.toString().padStart(3, '0')}°
      </div>
    </div>
  );
};
