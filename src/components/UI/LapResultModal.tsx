import React from 'react';
import { LapTelemetry } from '../../types/track';
import { formatTime } from '../../utils/time';
import { Trophy, Gauge, Pencil, RotateCcw, AlertOctagon } from 'lucide-react';

interface LapResultModalProps {
  telemetry: LapTelemetry;
  onContinueDriving: () => void;
  onSwitchToEditor: () => void;
}

export const LapResultModal: React.FC<LapResultModalProps> = ({
  telemetry,
  onContinueDriving,
  onSwitchToEditor
}) => {
  const isValid = telemetry.lapValid;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 select-none p-4 font-sans">
      <div className="bg-[#0E131F] border border-[#1E2638] rounded-3xl p-6 shadow-2xl max-w-sm w-full text-slate-100 flex flex-col items-center space-y-5 relative overflow-hidden">
        {/* Header Icon */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${
          isValid
            ? 'bg-[#E10600] shadow-red-600/30'
            : 'bg-amber-600 shadow-amber-600/30'
        }`}>
          {isValid ? <Trophy className="w-7 h-7" /> : <AlertOctagon className="w-7 h-7" />}
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-black uppercase tracking-wider text-white">
            {isValid ? 'CIRCUIT COMPLETE' : 'LAP INVALID'}
          </h2>
          <p className="text-xs font-mono text-slate-400">
            {isValid ? 'VALID LAP TIME RECORDED' : 'CORNER CUT / RETURNED OFF TRACK'}
          </p>
        </div>

        {/* Lap Time Display */}
        <div className="bg-[#121721] p-4 rounded-2xl border border-[#1E2638] w-full text-center space-y-1">
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
            {isValid ? 'FINAL LAP TIME' : 'UNOFFICIAL TIME'}
          </span>
          <div className={`text-3xl font-extrabold font-mono tracking-tight ${
            isValid ? 'text-amber-400' : 'text-slate-500 line-through'
          }`}>
            {formatTime(telemetry.lastLapTime)}
          </div>
        </div>

        {/* Top Speed Stat */}
        <div className="flex items-center justify-between w-full p-3 rounded-xl bg-[#121721] border border-[#1E2638] text-xs font-mono">
          <span className="flex items-center gap-2 text-slate-300 font-sans">
            <Gauge className="w-4 h-4 text-cyan-400" /> TOP SPEED
          </span>
          <span className="font-bold text-cyan-400 text-sm">
            {telemetry.maxSpeedKmh} KM/H
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full pt-1">
          <button
            onClick={onContinueDriving}
            className="py-3 px-4 rounded-xl bg-[#E10600] hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> DRIVE AGAIN
          </button>

          <button
            onClick={onSwitchToEditor}
            className="py-3 px-4 rounded-xl bg-[#121721] hover:bg-slate-800 border border-[#1E2638] text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Pencil className="w-4 h-4 text-cyan-400" /> EDIT CIRCUIT
          </button>
        </div>
      </div>
    </div>
  );
};
