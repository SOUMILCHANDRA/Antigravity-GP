import React, { useState, useMemo } from 'react';
import { SplinePoint, TrackConfig } from '../../types/track';
import { simulateCircuitLap, LapSimulationResult } from '../../utils/headlessSim';
import { exportCircuitJSON, exportCircuitSVG, exportCircuitPNG } from '../../utils/trackExport';
import { ElevationSpeedChart } from './ElevationSpeedChart';
import { FlythroughCameraMode } from '../Race3D/FlythroughCamera';
import { importTrackFile } from '../../utils/trackImport';

interface ShowStagePanelProps {
  track: TrackConfig;
  setTrack: (updater: TrackConfig | ((prev: TrackConfig) => TrackConfig), desc?: string) => void;
  splinePoints: SplinePoint[];
  playerCarId?: string;
  is3DFlythrough: boolean;
  setIs3DFlythrough: (enabled: boolean) => void;
  flythroughProgress: number;
  setFlythroughProgress: (progress: number) => void;
  isFlythroughPlaying: boolean;
  setIsFlythroughPlaying: (playing: boolean) => void;
  flythroughSpeed: number;
  setFlythroughSpeed: (speed: number) => void;
  flythroughCameraMode: FlythroughCameraMode;
  setFlythroughCameraMode: (mode: FlythroughCameraMode) => void;
  onEnterRaceMode: () => void;
}

export const ShowStagePanel: React.FC<ShowStagePanelProps> = ({
  track,
  setTrack,
  splinePoints,
  playerCarId,
  is3DFlythrough,
  setIs3DFlythrough,
  flythroughProgress,
  setFlythroughProgress,
  isFlythroughPlaying,
  setIsFlythroughPlaying,
  flythroughSpeed,
  setFlythroughSpeed,
  flythroughCameraMode,
  setFlythroughCameraMode,
  onEnterRaceMode
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'turns' | 'export'>('overview');
  const [isExportingPNG, setIsExportingPNG] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Run headless fast lap & FIA homologation simulation
  const simResult: LapSimulationResult = useMemo(() => {
    return simulateCircuitLap(splinePoints, track, playerCarId);
  }, [splinePoints, track, playerCarId]);

  const currentFlythroughDist = useMemo(() => {
    return flythroughProgress * simResult.totalLengthMeters;
  }, [flythroughProgress, simResult.totalLengthMeters]);

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      const importedTrack = importTrackFile(text, file.name);
      setTrack(importedTrack, `Import Circuit: ${importedTrack.name}`);
      setImportError(null);
    }).catch((err: unknown) => {
      setImportError(err instanceof Error ? err.message : 'Failed to import this circuit file.');
    });
    e.target.value = '';
  };

  const handleExportPNG = async () => {
    setIsExportingPNG(true);
    try {
      await exportCircuitPNG(track, splinePoints, simResult);
    } catch (err) {
      console.error('PNG export failed', err);
    } finally {
      setIsExportingPNG(false);
    }
  };

  return (
    <div className="absolute top-16 left-6 w-[430px] max-h-[calc(100vh-100px)] flex flex-col bg-[#0F172A]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl z-30 overflow-hidden text-slate-100">
      {/* Stage Header */}
      <div className="p-4 border-b border-slate-700/60 flex items-center justify-between bg-slate-900/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase font-mono">STAGE 3</span>
            <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-800">SHOW & TELEMETRY</span>
          </div>
          <h2 className="text-base font-extrabold text-white tracking-wide mt-0.5">
            {track.name || 'Antigravity GP Circuit'}
          </h2>
        </div>

        {/* FIA Grade Tag */}
        <div
          className="px-2.5 py-1 rounded-full text-[11px] font-bold font-mono border shadow-sm flex items-center gap-1.5"
          style={{
            borderColor: `${simResult.fiaGrade.badgeColor}66`,
            backgroundColor: `${simResult.fiaGrade.badgeColor}1A`,
            color: simResult.fiaGrade.badgeColor
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: simResult.fiaGrade.badgeColor }} />
          {simResult.fiaGrade.grade}
        </div>
      </div>

      {/* 3D Flythrough Camera Header Bar */}
      <div className="px-4 py-2.5 bg-slate-800/40 border-b border-slate-700/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300">3D Flythrough View:</span>
          <button
            onClick={() => setIs3DFlythrough(!is3DFlythrough)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              is3DFlythrough
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {is3DFlythrough ? '🎥 3D Active' : '🗺️ 2D Map'}
          </button>
        </div>

        {is3DFlythrough && (
          <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-700 text-[10px] font-mono">
            {(['drone', 'helicopter', 'broadcast'] as FlythroughCameraMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFlythroughCameraMode(mode)}
                className={`px-2 py-0.5 rounded capitalize transition-all ${
                  flythroughCameraMode === mode
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode === 'broadcast' ? 'TV' : mode}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Flythrough Playback Controls if 3D Active */}
      {is3DFlythrough && (
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-700/60 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFlythroughPlaying(!isFlythroughPlaying)}
                className="w-8 h-8 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shadow-cyan-500/20"
                title={isFlythroughPlaying ? 'Pause flythrough' : 'Play flythrough'}
              >
                {isFlythroughPlaying ? '⏸' : '▶'}
              </button>
              <button
                onClick={() => {
                  setFlythroughProgress(0);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700"
                title="Restart at Start/Finish"
              >
                ⏮ S/F
              </button>
            </div>

            {/* Speed Multiplier */}
            <div className="flex items-center gap-1 text-[11px] font-mono">
              {[0.5, 1.0, 2.0, 4.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setFlythroughSpeed(s)}
                  className={`px-1.5 py-0.5 rounded ${
                    flythroughSpeed === s
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Scrub Slider */}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={flythroughProgress}
              onChange={(e) => setFlythroughProgress(parseFloat(e.target.value))}
              className="flex-1 accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <span className="text-[11px] font-mono text-cyan-400 w-12 text-right">
              {Math.round(flythroughProgress * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Tabs: Overview / Turns / Export */}
      <div className="flex border-b border-slate-700/60 bg-slate-900/40 text-xs font-mono">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 text-center transition-colors border-b-2 ${
            activeTab === 'overview'
              ? 'border-cyan-400 text-cyan-300 font-bold bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          TELEMETRY
        </button>
        <button
          onClick={() => setActiveTab('turns')}
          className={`flex-1 py-2 text-center transition-colors border-b-2 ${
            activeTab === 'turns'
              ? 'border-cyan-400 text-cyan-300 font-bold bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          TURNS ({simResult.turns.length})
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-2 text-center transition-colors border-b-2 ${
            activeTab === 'export'
              ? 'border-cyan-400 text-cyan-300 font-bold bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          EXPORT & SHARE
        </button>
      </div>

      {/* Scrollable Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs font-sans">
        {/* TAB 1: OVERVIEW & TELEMETRY */}
        {activeTab === 'overview' && (
          <>
            {/* Key Circuit Metrics Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-mono uppercase">Total Distance</span>
                <div className="text-xl font-black font-mono text-white mt-1">
                  {(simResult.totalLengthMeters / 1000).toFixed(3)}{' '}
                  <span className="text-xs text-slate-400 font-normal">km</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {((simResult.totalLengthMeters / 1000) * 0.621371).toFixed(2)} miles
                </span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-mono uppercase">Est. Lap Time</span>
                <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                  {simResult.formattedLapTime}
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Simulated F1 Pace</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-mono uppercase">Top Speed</span>
                <div className="text-xl font-black font-mono text-cyan-400 mt-1">
                  {simResult.topSpeedKmh}{' '}
                  <span className="text-xs text-slate-400 font-normal">km/h</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  Min Apex: {simResult.minSpeedKmh} km/h
                </span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-mono uppercase">Average Speed</span>
                <div className="text-xl font-black font-mono text-amber-400 mt-1">
                  {simResult.avgSpeedKmh}{' '}
                  <span className="text-xs text-slate-400 font-normal">km/h</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Across full circuit</span>
              </div>
            </div>

            {/* Interactive Elevation & Speed Profile Chart */}
            <ElevationSpeedChart
              simResult={simResult}
              currentFlythroughDist={currentFlythroughDist}
              onClickDistance={(dist) => {
                if (simResult.totalLengthMeters > 0) {
                  setFlythroughProgress(dist / simResult.totalLengthMeters);
                }
              }}
            />

            {/* FIA Homologation Assessment Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">FIA Homologation Safety Audit</span>
                <span
                  className="text-[10px] font-bold font-mono px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${simResult.fiaGrade.badgeColor}22`,
                    color: simResult.fiaGrade.badgeColor
                  }}
                >
                  {simResult.fiaGrade.grade}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {simResult.fiaGrade.description}
              </p>

              <div className="flex flex-col gap-1.5 mt-1 border-t border-slate-800 pt-2">
                {simResult.fiaGrade.criteria.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className={c.passed ? 'text-emerald-400' : 'text-rose-400'}>
                        {c.passed ? '✓' : '✗'}
                      </span>
                      {c.name}
                    </span>
                    <span className={c.passed ? 'text-slate-200' : 'text-rose-300'}>
                      {c.value}{' '}
                      <span className="text-[10px] text-slate-500">({c.requirement})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: TURNS BREAKDOWN */}
        {activeTab === 'turns' && (
          <div className="flex flex-col gap-2">
            <div className="text-[11px] text-slate-400 mb-1">
              Curvature analysis detected{' '}
              <span className="text-white font-bold">{simResult.turns.length} corners</span>:
            </div>

            <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-1">
              {simResult.turns.map((turn) => (
                <div
                  key={turn.label}
                  onClick={() => {
                    if (simResult.totalLengthMeters > 0) {
                      setFlythroughProgress(turn.distance / simResult.totalLengthMeters);
                    }
                  }}
                  className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 text-slate-200 font-mono font-bold flex items-center justify-center border border-slate-700">
                      {turn.label}
                    </span>
                    <div className="flex flex-col">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{turn.direction === 'left' ? '↰ Left' : '↱ Right'} Hand</span>
                        <span className="text-[10px] text-slate-500 font-mono">@{turn.distance}m</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>R: {turn.radiusMeters}m</span>
                        {turn.bankingDeg !== 0 && (
                          <span className="text-amber-400">∠{turn.bankingDeg > 0 ? `+${turn.bankingDeg}` : turn.bankingDeg}°</span>
                        )}
                        <span>Alt: {turn.elevationMeters > 0 ? `+${turn.elevationMeters}` : turn.elevationMeters}m</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black font-mono text-cyan-400">
                      {turn.apexSpeedKmh} <span className="text-[9px] text-slate-400 font-normal">km/h</span>
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">Apex Speed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: EXPORT & SHARING */}
        {activeTab === 'export' && (
          <div className="flex flex-col gap-3">
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Export high-fidelity circuit files, vector blueprint diagrams, or import existing designs:
            </div>

            {/* Export Buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => exportCircuitJSON(track)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📦</span>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Circuit Data (JSON)</div>
                    <div className="text-[10px] text-slate-400">Standard Antigravity schema v2 with facilities</div>
                  </div>
                </div>
                <span className="text-xs font-mono text-cyan-400 font-bold">.JSON ↓</span>
              </button>

              <button
                onClick={() => exportCircuitSVG(track, splinePoints, simResult)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📐</span>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Technical Blueprint (SVG)</div>
                    <div className="text-[10px] text-slate-400">Scalable vector schematic with title block</div>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold">.SVG ↓</span>
              </button>

              <button
                onClick={handleExportPNG}
                disabled={isExportingPNG}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold flex items-center justify-between transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🖼️</span>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">High-Res Poster (PNG)</div>
                    <div className="text-[10px] text-slate-400">Crisp 2x resolution rasterized graphic</div>
                  </div>
                </div>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  {isExportingPNG ? 'Rendering...' : '.PNG ↓'}
                </span>
              </button>
            </div>

            {/* Import Circuit JSON */}
            <div className="mt-2 pt-3 border-t border-slate-800 flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-300">Import Existing Circuit</span>
              <label className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-600 hover:border-cyan-400 bg-slate-900/50 hover:bg-slate-900 cursor-pointer flex items-center justify-center gap-2 text-slate-300 transition-all">
                <span>📁</span>
                <span className="text-xs font-mono">Upload JSON, GPX, KML, or GeoJSON</span>
                <input
                  type="file"
                  accept=".json,.gpx,.kml,.geojson,application/json,application/gpx+xml,application/vnd.google-earth.kml+xml,application/geo+json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
              <span className="text-[10px] text-slate-500">GPS coordinates are projected to a local metre grid. Track width and venue detail can be edited after import.</span>

              {importError && (
                <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-mono">
                  {importError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Quick Action: Launch F1 Grand Prix */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <button
          onClick={onEnterRaceMode}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
        >
          <span>🏁</span>
          <span>LAUNCH GRAND PRIX DRIVE</span>
        </button>
      </div>
    </div>
  );
};
