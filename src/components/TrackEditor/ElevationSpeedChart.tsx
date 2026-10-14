import React, { useState, useMemo } from 'react';
import { LapSimulationResult } from '../../utils/headlessSim';

interface ElevationSpeedChartProps {
  simResult: LapSimulationResult;
  onHoverDistance?: (distance: number | null) => void;
  onClickDistance?: (distance: number) => void;
  currentFlythroughDist?: number;
}

export const ElevationSpeedChart: React.FC<ElevationSpeedChartProps> = ({
  simResult,
  onHoverDistance,
  onClickDistance,
  currentFlythroughDist
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const profile = simResult.speedProfile;

  const totalLength = simResult.totalLengthMeters || 1;

  // Compute elevation domain
  const { minElev, maxElev, elevRange } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const p of profile) {
      if (p.elevation < min) min = p.elevation;
      if (p.elevation > max) max = p.elevation;
    }
    if (min === Infinity) {
      min = 0;
      max = 10;
    }
    const range = Math.max(5, max - min);
    return { minElev: min, maxElev: max, elevRange: range };
  }, [profile]);

  // Chart dimensions
  const width = 640;
  const height = 180;
  const padLeft = 45;
  const padRight = 45;
  const padTop = 20;
  const padBottom = 28;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Map distance to X
  const getX = (dist: number) => padLeft + (dist / totalLength) * chartW;

  // Map elevation to Y (Left axis)
  const getElevY = (elev: number) => padTop + chartH - ((elev - minElev) / elevRange) * chartH;

  // Map speed (0 to topSpeed + 20) to Y (Right axis)
  const maxSpeedAxis = Math.max(200, Math.ceil(simResult.topSpeedKmh / 50) * 50);
  const getSpeedY = (spd: number) => padTop + chartH - (spd / maxSpeedAxis) * chartH;

  // Build SVG Paths
  const { elevPath, elevAreaPath, speedPath } = useMemo(() => {
    if (profile.length === 0) return { elevPath: '', elevAreaPath: '', speedPath: '' };

    let eLine = '';
    let sLine = '';

    profile.forEach((pt, i) => {
      const x = getX(pt.distance);
      const ey = getElevY(pt.elevation);
      const sy = getSpeedY(pt.speedKmh);

      if (i === 0) {
        eLine += `M ${x.toFixed(1)} ${ey.toFixed(1)}`;
        sLine += `M ${x.toFixed(1)} ${sy.toFixed(1)}`;
      } else {
        eLine += ` L ${x.toFixed(1)} ${ey.toFixed(1)}`;
        sLine += ` L ${x.toFixed(1)} ${sy.toFixed(1)}`;
      }
    });

    const baselineY = padTop + chartH;
    const eArea = `${eLine} L ${padLeft + chartW} ${baselineY} L ${padLeft} ${baselineY} Z`;

    return { elevPath: eLine, elevAreaPath: eArea, speedPath: sLine };
  }, [profile, totalLength, minElev, elevRange, maxSpeedAxis]);

  const activePoint = hoverIdx !== null && profile[hoverIdx] ? profile[hoverIdx] : null;

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Circuit Elevation & Velocity</span>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2.5 h-1 rounded-full bg-cyan-400 inline-block" />
              Speed (km/h)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-1 rounded-full bg-emerald-400 inline-block" />
              Elevation (m)
            </span>
          </div>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Δh: <span className="text-white font-bold">{(maxElev - minElev).toFixed(1)}m</span> | Top: <span className="text-cyan-400 font-bold">{simResult.topSpeedKmh} km/h</span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair block"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width * width;
            const normX = Math.max(0, Math.min(1, (relX - padLeft) / chartW));
            const targetDist = normX * totalLength;
            // Find closest profile index
            let bestIdx = 0;
            let bestDiff = Infinity;
            profile.forEach((pt, i) => {
              const diff = Math.abs(pt.distance - targetDist);
              if (diff < bestDiff) {
                bestDiff = diff;
                bestIdx = i;
              }
            });
            setHoverIdx(bestIdx);
            onHoverDistance?.(profile[bestIdx]?.distance ?? null);
          }}
          onMouseLeave={() => {
            setHoverIdx(null);
            onHoverDistance?.(null);
          }}
          onClick={() => {
            if (activePoint && onClickDistance) {
              onClickDistance(activePoint.distance);
            }
          }}
        >
          <defs>
            <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padLeft} y1={padTop} x2={padLeft + chartW} y2={padTop} stroke="#1E293B" strokeDasharray="3 3" />
          <line x1={padLeft} y1={padTop + chartH * 0.5} x2={padLeft + chartW} y2={padTop + chartH * 0.5} stroke="#1E293B" strokeDasharray="3 3" />
          <line x1={padLeft} y1={padTop + chartH} x2={padLeft + chartW} y2={padTop + chartH} stroke="#334155" />

          {/* Elevation Area & Line */}
          <path d={elevAreaPath} fill="url(#elevGradient)" />
          <path d={elevPath} fill="none" stroke="#10B981" strokeWidth="2" />

          {/* Speed Line */}
          <path d={speedPath} fill="none" stroke="#00E5FF" strokeWidth="2.2" strokeLinecap="round" />

          {/* Turn Markers along distance */}
          {simResult.turns.map((turn) => {
            const tx = getX(turn.distance);
            return (
              <g key={turn.label} transform={`translate(${tx.toFixed(1)}, 0)`}>
                <line y1={padTop} y2={padTop + chartH} stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
                <rect x="-11" y={padTop - 12} width="22" height="13" rx="3" fill="#1E293B" stroke="#00E5FF" strokeWidth="1" />
                <text y={padTop - 3} textAnchor="middle" fill="#FFFFFF" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  {turn.label}
                </text>
              </g>
            );
          })}

          {/* Left Axis: Elevation Labels */}
          <text x={padLeft - 8} y={padTop + 4} textAnchor="end" fill="#64748B" fontSize="9" fontFamily="monospace">
            {maxElev.toFixed(0)}m
          </text>
          <text x={padLeft - 8} y={padTop + chartH} textAnchor="end" fill="#64748B" fontSize="9" fontFamily="monospace">
            {minElev.toFixed(0)}m
          </text>

          {/* Right Axis: Speed Labels */}
          <text x={padLeft + chartW + 8} y={padTop + 4} textAnchor="start" fill="#64748B" fontSize="9" fontFamily="monospace">
            {maxSpeedAxis}
          </text>
          <text x={padLeft + chartW + 8} y={padTop + chartH} textAnchor="start" fill="#64748B" fontSize="9" fontFamily="monospace">
            0
          </text>

          {/* Distance Labels */}
          <text x={padLeft} y={height - 8} textAnchor="start" fill="#64748B" fontSize="9" fontFamily="monospace">
            0m
          </text>
          <text x={padLeft + chartW * 0.5} y={height - 8} textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="monospace">
            {(totalLength * 0.5).toFixed(0)}m
          </text>
          <text x={padLeft + chartW} y={height - 8} textAnchor="end" fill="#64748B" fontSize="9" fontFamily="monospace">
            {totalLength.toFixed(0)}m
          </text>

          {/* Current Flythrough scrubber line if playing */}
          {currentFlythroughDist !== undefined && (
            <line
              x1={getX(currentFlythroughDist)}
              y1={padTop}
              x2={getX(currentFlythroughDist)}
              y2={padTop + chartH}
              stroke="#F59E0B"
              strokeWidth="2"
            />
          )}

          {/* Active Hover Guide & Crosshair */}
          {activePoint && (
            <g transform={`translate(${getX(activePoint.distance).toFixed(1)}, 0)`}>
              <line y1={padTop} y2={padTop + chartH} stroke="#F8FAFC" strokeWidth="1" strokeDasharray="3 2" />
              <circle cy={getElevY(activePoint.elevation)} r="4" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
              <circle cy={getSpeedY(activePoint.speedKmh)} r="4" fill="#00E5FF" stroke="#FFFFFF" strokeWidth="1.5" />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {activePoint && (
          <div
            className="absolute top-2 pointer-events-none bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded px-2.5 py-1 text-[11px] font-mono shadow-xl flex items-center gap-3 transition-all"
            style={{
              left: `${Math.max(10, Math.min(85, (activePoint.distance / totalLength) * 100))}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <span className="text-slate-300">@{activePoint.distance}m</span>
            <span className="text-cyan-400 font-bold">{activePoint.speedKmh} km/h</span>
            <span className="text-emerald-400 font-bold">{activePoint.elevation > 0 ? `+${activePoint.elevation}` : activePoint.elevation}m</span>
            {activePoint.banking !== 0 && (
              <span className="text-amber-400 font-bold">∠{activePoint.banking > 0 ? `+${activePoint.banking}` : activePoint.banking}°</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
