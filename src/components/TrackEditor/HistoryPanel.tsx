import React from 'react';
import { History, RotateCcw, X, Clock } from 'lucide-react';
import { HistoryEntry } from '../../utils/history';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  entries: { past: HistoryEntry[]; present: HistoryEntry; future: HistoryEntry[] };
  onJumpToPast: (index: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  onClose,
  entries,
  onJumpToPast,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  if (!isOpen) return null;

  const { past, present, future } = entries;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toTimeString().split(' ')[0];
  };

  return (
    <div className="absolute right-84 top-4 z-40 w-72 bg-[#121721]/95 backdrop-blur-md border border-[#1E2638] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[480px]">
      {/* Header */}
      <div className="p-3 border-b border-[#1E2638] flex items-center justify-between bg-[#161D2B]">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
          <History className="w-4 h-4 text-cyan-400" />
          <span>EDIT HISTORY</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Close History Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Entry List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs font-mono">
        {/* Past entries */}
        {past.map((entry, idx) => (
          <button
            key={`past-${idx}`}
            onClick={() => onJumpToPast(idx)}
            className="w-full text-left p-2 rounded-lg hover:bg-[#1A2332] text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-between group"
            title="Click to revert to this point"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-4 text-[10px] text-slate-600">{idx + 1}</span>
              <span className="truncate">{entry.action}</span>
            </div>
            <span className="text-[10px] text-slate-600 group-hover:text-slate-400 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formatTime(entry.timestamp)}
            </span>
          </button>
        ))}

        {/* Current State */}
        <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-bold flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="truncate">{present.action}</span>
          </div>
          <span className="text-[10px] text-cyan-400/80">CURRENT</span>
        </div>

        {/* Future entries (undone) */}
        {future.map((entry, idx) => (
          <div
            key={`future-${idx}`}
            className="p-2 rounded-lg text-slate-600 flex items-center justify-between opacity-60"
          >
            <span className="truncate line-through">{entry.action}</span>
            <span className="text-[10px]">{formatTime(entry.timestamp)}</span>
          </div>
        ))}
      </div>

      {/* Quick Footer Controls */}
      <div className="p-2.5 border-t border-[#1E2638] bg-[#0E131F] flex items-center justify-between text-xs">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="px-3 py-1.5 rounded-lg bg-[#18202F] hover:bg-slate-800 text-slate-200 font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Undo
        </button>
        <span className="text-[10px] text-slate-500 font-mono">
          {past.length} past / {future.length} redo
        </span>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="px-3 py-1.5 rounded-lg bg-[#18202F] hover:bg-slate-800 text-slate-200 font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Redo
        </button>
      </div>
    </div>
  );
};
