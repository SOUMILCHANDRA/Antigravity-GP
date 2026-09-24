import React from 'react';
import { 
  Pencil, 
  Flag, 
  Volume2, 
  VolumeX, 
  Download, 
  Upload,
  Play
} from 'lucide-react';
import { AppMode, TrackConfig } from '../types/track';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  currentTrack: TrackConfig;
  isMuted: boolean;
  onToggleMute: () => void;
  onExportTrack: () => void;
  onImportTrack: (e: React.ChangeEvent<HTMLInputElement>) => void;
  circuitLength: number;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  setMode,
  currentTrack,
  isMuted,
  onToggleMute,
  onExportTrack,
  onImportTrack,
  circuitLength
}) => {
  const isValidTrack = currentTrack.isClosed && currentTrack.nodes.length >= 3;

  return (
    <header className="h-16 bg-[#0E131F] border-b border-[#1E2638] px-6 flex items-center justify-between z-40 select-none font-sans">
      {/* Left Brand Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#E10600] flex items-center justify-center font-black text-white italic text-base shadow-md">
          AG
        </div>
        <div>
          <h1 className="font-extrabold text-sm tracking-wider text-slate-100 uppercase">
            Antigravity <span className="text-[#E10600]">GP</span>
          </h1>
          <p className="text-[11px] text-slate-400 font-mono">
            {mode === 'builder' ? 'TRACK DESIGNER' : '3D RACE MODE'}
          </p>
        </div>
      </div>

      {/* Center Mode Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-[#121721] rounded-xl border border-[#1E2638]">
        <button
          onClick={() => setMode('builder')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
            mode === 'builder'
              ? 'bg-[#E10600] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>DESIGN CIRCUIT</span>
        </button>

        <button
          onClick={() => {
            if (isValidTrack) setMode('race');
          }}
          disabled={!isValidTrack}
          title={!isValidTrack ? 'Close circuit to enable Drive mode' : 'Drive your circuit in 3D'}
          className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
            mode === 'race'
              ? 'bg-[#00FF66] text-slate-950 shadow-md shadow-emerald-500/30'
              : isValidTrack
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-600 hover:bg-emerald-900 cursor-pointer'
              : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>DRIVE</span>
        </button>
      </div>

      {/* Right Stats & Tools */}
      <div className="flex items-center gap-4">
        {/* Dynamic Circuit Stats (Shows — when empty) */}
        <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-lg bg-[#121721] border border-[#1E2638] text-xs font-mono">
          <span className="text-slate-400">LENGTH:</span>
          <span className="text-slate-200 font-bold">
            {isValidTrack ? `${(circuitLength / 1000).toFixed(2)} km` : '—'}
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400">CORNERS:</span>
          <span className="text-slate-200 font-bold">
            {currentTrack.nodes.length > 0 ? currentTrack.nodes.length : '—'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onExportTrack}
            disabled={currentTrack.nodes.length === 0}
            title="Export Circuit (JSON)"
            className="p-2 rounded-lg bg-[#121721] hover:bg-slate-800 border border-[#1E2638] text-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
          </button>

          <label
            title="Import Circuit (JSON)"
            className="p-2 rounded-lg bg-[#121721] hover:bg-slate-800 border border-[#1E2638] text-slate-300 cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4" />
            <input type="file" accept=".json" onChange={onImportTrack} className="hidden" />
          </label>

          <button
            onClick={onToggleMute}
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
            className={`p-2 rounded-lg border transition-colors ${
              isMuted 
                ? 'bg-slate-900 border-slate-800 text-slate-500' 
                : 'bg-emerald-950 border-emerald-700 text-emerald-400'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
