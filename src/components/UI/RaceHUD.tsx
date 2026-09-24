import React from 'react';
import { LapTelemetry, RaceBattleState } from '../../types/track';
import { formatTime } from '../../utils/time';
import { Timer, Trophy, Gauge, AlertTriangle, Route, CheckCircle, RotateCcw, Swords } from 'lucide-react';

export { formatTime };

interface RaceHUDProps {
  telemetry: LapTelemetry;
  speedKmh: number;
  isOffTrack: boolean;
  showRacingLine: boolean;
  onToggleRacingLine: () => void;
  onReset?: () => void;
  lapToast?: { message: string; isBest: boolean } | null;
  battleState?: RaceBattleState | null;
  aiEnabled?: boolean;
  onToggleAI?: () => void;
  aiTelemetry?: LapTelemetry | null;
}

export const RaceHUD: React.FC<RaceHUDProps> = ({
  telemetry,
  speedKmh,
  isOffTrack,
  showRacingLine,
  onToggleRacingLine,
  onReset,
  lapToast,
  battleState,
  aiEnabled = true,
  onToggleAI,
  aiTelemetry
}) => {
  const isReverse = speedKmh < 0;
  const absSpeed = Math.abs(speedKmh);

  return (
    <div className="absolute top-20 left-6 flex flex-col gap-3 z-30 select-none font-mono text-slate-100">
      {/* 1. Live Speedometer Pill, Racing Line Toggle, AI Rival Toggle & Reset Button */}
      <div className="flex items-center gap-2">
        <div className="bg-[#0E131F]/90 backdrop-blur-md border border-[#1E2638] rounded-2xl px-5 py-3 shadow-xl flex items-baseline gap-2">
          <Gauge className="w-4 h-4 text-[#E10600]" />
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {isReverse ? `R ${absSpeed}` : absSpeed}
          </span>
          <span className="text-xs font-bold text-red-500 font-sans">
            {isReverse ? 'REV' : 'KM/H'}
          </span>
        </div>

        {/* Ideal Racing Line Toggle */}
        <button
          onClick={onToggleRacingLine}
          title={showRacingLine ? 'Hide Ideal Racing Line' : 'Show Ideal Racing Line'}
          className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${
            showRacingLine
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20'
              : 'bg-[#0E131F]/90 border-[#1E2638] text-slate-400 hover:text-slate-200'
          }`}
        >
          <Route className="w-5 h-5" />
        </button>

        {/* AI Competitor Toggle */}
        {onToggleAI && (
          <button
            onClick={onToggleAI}
            title={aiEnabled ? 'Disable AI Rival Competitor' : 'Enable AI Rival Competitor'}
            className={`p-3 rounded-2xl border transition-all flex items-center justify-center ${
              aiEnabled
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-500/20'
                : 'bg-[#0E131F]/90 border-[#1E2638] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords className="w-5 h-5" />
          </button>
        )}

        {/* Car & Timer Reset Button */}
        {onReset && (
          <button
            onClick={onReset}
            title="Reset Cars to Start & Restart Timer (R)"
            className="p-3 rounded-2xl border bg-[#0E131F]/90 border-[#1E2638] text-slate-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-950/30 transition-all flex items-center justify-center active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Live Grand Prix Position & Battle Interval Card */}
      {aiEnabled && battleState && (
        <div className="bg-[#0E131F]/90 backdrop-blur-md border border-[#1E2638] rounded-2xl px-4 py-2.5 shadow-xl flex items-center justify-between min-w-[220px]">
          <div className="flex items-center gap-2">
            <span
              className={`text-lg font-black px-2.5 py-0.5 rounded-xl border ${
                battleState.playerRank === 1
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm shadow-amber-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              P{battleState.playerRank}
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] font-sans font-bold text-white tracking-wide">
                {battleState.playerRank === 1 ? 'LEADER' : 'CHASING'}
              </span>
              <span className="text-[9px] font-mono text-cyan-400">
                VS APEX AI
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[9px] text-slate-400 font-sans uppercase tracking-wider">
              {battleState.playerRank === 1 ? 'GAP AHEAD' : 'INTERVAL'}
            </div>
            <div
              className={`text-sm font-mono font-extrabold ${
                battleState.playerRank === 1 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {battleState.playerRank === 1
                ? `+${battleState.gapMeters}m`
                : `-${battleState.gapMeters}m`}
            </div>
          </div>
        </div>
      )}

      {/* 2. Lap Complete Flying Banner */}
      {lapToast && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border backdrop-blur-md shadow-2xl font-sans transition-all duration-300 ${
          lapToast.isBest
            ? 'bg-purple-950/95 border-purple-500 text-purple-200 shadow-purple-900/40'
            : 'bg-emerald-950/95 border-emerald-500 text-emerald-200 shadow-emerald-900/40'
        }`}>
          {lapToast.isBest ? <Trophy className="w-4 h-4 text-amber-400 shrink-0" /> : <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
          <span className="text-xs font-bold tracking-wide">{lapToast.message}</span>
        </div>
      )}

      {/* 3. Lap Timer Card */}
      <div className="bg-[#0E131F]/90 backdrop-blur-md border border-[#1E2638] rounded-2xl p-4 shadow-xl space-y-3 min-w-[220px]">
        <div>
          <div className="flex items-center justify-between text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            <span className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-[#E10600]" /> LAP TIME
            </span>
            {!telemetry.lapValid && (
              <span className="text-red-400 text-[9px] bg-red-950/80 px-1.5 py-0.5 rounded border border-red-800/60 font-mono">
                INVALID
              </span>
            )}
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            {formatTime(telemetry.currentLapTime)}
          </div>
        </div>

        <div className="pt-2 border-t border-[#1E2638] flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-slate-400 font-sans">
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> BEST LAP
          </span>
          <span className="font-bold text-amber-400">
            {formatTime(telemetry.bestLapTime)}
          </span>
        </div>

        {aiEnabled && aiTelemetry?.bestLapTime && (
          <div className="pt-1.5 border-t border-[#1E2638]/60 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 text-cyan-400 font-sans font-bold">
              AI BEST
            </span>
            <span className="font-bold text-cyan-300 font-mono">
              {formatTime(aiTelemetry.bestLapTime)}
            </span>
          </div>
        )}
      </div>

      {/* 4. Off Track Warning Badge */}
      {isOffTrack && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/90 border border-amber-500 text-amber-300 text-xs font-bold font-sans shadow-lg animate-bounce">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>OFF TRACK</span>
        </div>
      )}
    </div>
  );
};
