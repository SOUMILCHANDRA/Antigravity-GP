import React from 'react';
import { 
  Undo, 
  Redo, 
  Trash2, 
  RotateCcw, 
  Layers, 
  Play,
  CheckCircle2
} from 'lucide-react';
import { TrackConfig, TrackNode } from '../../types/track';
import { estimateLapTime } from '../../utils/spline';

interface EditorToolbarProps {
  track: TrackConfig;
  setTrack: React.Dispatch<React.SetStateAction<TrackConfig>>;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  circuitLength: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearTrack: () => void;
  onDrive: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  track,
  setTrack,
  selectedNodeId,
  setSelectedNodeId,
  circuitLength,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearTrack,
  onDrive
}) => {
  const selectedNodeIndex = track.nodes.findIndex(n => n.id === selectedNodeId);
  const isValidTrack = track.isClosed && track.nodes.length >= 3;
  const canCloseCircuit = !track.isClosed && track.nodes.length >= 3;

  // Handle Delete Selected Node
  const handleDeleteNode = () => {
    if (!selectedNodeId) return;
    setTrack(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== selectedNodeId),
      isClosed: prev.nodes.length - 1 < 3 ? false : prev.isClosed
    }));
    setSelectedNodeId(null);
  };

  // Close Circuit Loop
  const handleCloseCircuit = () => {
    if (track.nodes.length < 3) return;
    setTrack(prev => ({ ...prev, isClosed: true }));
  };

  // Track Width Update
  const handleWidthChange = (newWidth: number) => {
    setTrack(prev => ({
      ...prev,
      defaultWidth: newWidth,
      nodes: prev.nodes.map(n => ({ ...n, width: newWidth }))
    }));
  };

  const estimatedTime = isValidTrack ? estimateLapTime(circuitLength, track.nodes.length) : null;

  return (
    <div className="w-80 bg-[#0E131F] border-l border-[#1E2638] h-[calc(100vh-64px)] p-5 flex flex-col justify-between overflow-y-auto z-30 select-none text-slate-200 font-sans">
      <div className="space-y-6">
        {/* Main Drive CTA Button */}
        <button
          onClick={onDrive}
          disabled={!isValidTrack}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl transition-all ${
            isValidTrack
              ? 'bg-[#00FF66] hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 cursor-pointer'
              : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>DRIVE YOUR CIRCUIT</span>
        </button>

        {/* Close Circuit Prompt CTA */}
        {canCloseCircuit && (
          <button
            onClick={handleCloseCircuit}
            className="w-full py-3 px-4 rounded-xl bg-emerald-950 border border-emerald-600 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-900 transition-colors animate-pulse"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>CLOSE CIRCUIT LOOP</span>
          </button>
        )}

        {/* Section 1: Track Editor Actions (Undo, Redo, Clear) */}
        <div className="bg-[#121721] p-4 rounded-xl border border-[#1E2638] space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            EDITOR CONTROLS
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="py-2 px-3 rounded-lg bg-[#18202F] hover:bg-slate-800 text-slate-200 font-semibold flex items-center justify-center gap-1.5 border border-[#243046] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Undo className="w-3.5 h-3.5" /> UNDO
            </button>

            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="py-2 px-3 rounded-lg bg-[#18202F] hover:bg-slate-800 text-slate-200 font-semibold flex items-center justify-center gap-1.5 border border-[#243046] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Redo className="w-3.5 h-3.5" /> REDO
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={handleDeleteNode}
              disabled={!selectedNodeId}
              className="py-2 px-3 rounded-lg bg-red-950/50 hover:bg-red-900/80 text-red-300 font-semibold flex items-center justify-center gap-1.5 border border-red-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" /> DELETE POINT
            </button>

            <button
              onClick={onClearTrack}
              disabled={track.nodes.length === 0}
              className="py-2 px-3 rounded-lg bg-[#18202F] hover:bg-slate-800 text-slate-300 font-semibold flex items-center justify-center gap-1.5 border border-[#243046] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> CLEAR
            </button>
          </div>
        </div>

        {/* Section 2: Global Track Width Adjustment */}
        <div className="bg-[#121721] p-4 rounded-xl border border-[#1E2638] space-y-3 font-mono text-xs">
          <div className="flex justify-between text-slate-300 font-sans">
            <span className="flex items-center gap-1.5 font-bold text-slate-400">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> TRACK ROAD WIDTH
            </span>
            <span className="font-bold text-cyan-400 font-mono">{track.defaultWidth}m</span>
          </div>

          <input
            type="range"
            min="10"
            max="24"
            value={track.defaultWidth}
            onChange={(e) => handleWidthChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-[#1E2638] rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
          />
        </div>

        {/* Section 3: Clean Circuit Telemetry Breakdown */}
        <div className="bg-[#121721] p-4 rounded-xl border border-[#1E2638] space-y-2.5 font-mono text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans mb-3">
            CIRCUIT TELEMETRY
          </h3>

          <div className="flex justify-between items-center py-1.5 border-b border-[#1E2638]">
            <span className="text-slate-400 font-sans">TRACK LENGTH</span>
            <span className="font-bold text-slate-200">
              {isValidTrack ? `${(circuitLength / 1000).toFixed(3)} km` : '—'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-[#1E2638]">
            <span className="text-slate-400 font-sans font-sans">CORNERS</span>
            <span className="font-bold text-slate-200">
              {track.nodes.length > 0 ? `${track.nodes.length} POINTS` : '—'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5">
            <span className="text-slate-400 font-sans">EST. LAP TIME</span>
            <span className="font-bold text-slate-200">
              {estimatedTime !== null ? `${estimatedTime.toFixed(1)} s` : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[#1E2638] text-[11px] text-slate-500 font-mono text-center">
        Antigravity GP • Circuit Engineering Studio
      </div>
    </div>
  );
};
