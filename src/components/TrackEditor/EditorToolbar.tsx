import React from 'react';
import { 
  Undo, 
  Redo, 
  Trash2, 
  RotateCcw, 
  Layers, 
  Play,
  CheckCircle2,
  PenTool,
  Move,
  Eraser,
  Hand,
  Lock,
  Unlock,
  Flag,
  Maximize2,
  Magnet,
  History,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { TrackConfig, EditorTool } from '../../types/track';
import { estimateLapTime } from '../../utils/spline';
import { TrackStats } from '../../utils/trackAnalysis';

interface EditorToolbarProps {
  track: TrackConfig;
  setTrack: (updater: TrackConfig | ((prev: TrackConfig) => TrackConfig), actionDescription?: string) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  circuitLength: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearTrack: () => void;
  onDrive: () => void;
  activeTool: EditorTool;
  setActiveTool: (tool: EditorTool) => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  onZoomFit: () => void;
  onToggleHistoryPanel: () => void;
  isHistoryPanelOpen: boolean;
  onMoveStartLine: (nodeId: string) => void;
  stats?: TrackStats;
  onOpenPresets?: () => void;
  onToggleUnderlay?: () => void;
  isUnderlayOpen?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  track,
  setTrack,
  selectedNodeId,
  setSelectedNodeId,
  selectedNodeIds,
  setSelectedNodeIds,
  circuitLength,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearTrack,
  onDrive,
  activeTool,
  setActiveTool,
  snapEnabled,
  onToggleSnap,
  onZoomFit,
  onToggleHistoryPanel,
  isHistoryPanelOpen,
  onMoveStartLine,
  stats,
  onOpenPresets,
  onToggleUnderlay,
  isUnderlayOpen = false
}) => {
  const isValidTrack = track.isClosed && track.nodes.length >= 3;
  const canCloseCircuit = !track.isClosed && track.nodes.length >= 3;

  const activeSelectedSet = new Set(selectedNodeIds);
  if (selectedNodeId) activeSelectedSet.add(selectedNodeId);
  const selectedCount = activeSelectedSet.size;

  const primarySelectedNode = track.nodes.find(n => n.id === selectedNodeId) ||
    track.nodes.find(n => activeSelectedSet.has(n.id));

  // Handle Delete Selected Node(s)
  const handleDeleteSelected = () => {
    if (activeSelectedSet.size === 0) return;
    setTrack(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => !activeSelectedSet.has(n.id)),
      isClosed: prev.nodes.length - activeSelectedSet.size < 3 ? false : prev.isClosed
    }), `Delete ${activeSelectedSet.size} point(s)`);
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
  };

  // Close Circuit Loop
  const handleCloseCircuit = () => {
    if (track.nodes.length < 3) return;
    setTrack(prev => ({ ...prev, isClosed: true }), 'Close circuit loop');
  };

  // Track Width Update
  const handleWidthChange = (newWidth: number) => {
    setTrack(prev => ({
      ...prev,
      defaultWidth: newWidth,
      nodes: prev.nodes.map(n => ({ ...n, width: newWidth }))
    }), `Set track width to ${newWidth}m`);
  };

  // Lock / Unlock selected nodes
  const handleToggleLock = () => {
    if (activeSelectedSet.size === 0) return;
    const shouldLock = primarySelectedNode ? !primarySelectedNode.locked : true;
    setTrack(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => activeSelectedSet.has(n.id) ? { ...n, locked: shouldLock } : n)
    }), shouldLock ? 'Lock selected point(s)' : 'Unlock selected point(s)');
  };

  // Move Start/Finish to selected node
  const handleSetStartFinish = () => {
    if (!primarySelectedNode) return;
    onMoveStartLine(primarySelectedNode.id);
  };

  const estimatedTime = isValidTrack ? estimateLapTime(circuitLength, track.nodes.length) : null;

  return (
    <div className="editor-control-rail w-80 bg-[#0E131F] border-l border-[#1E2638] h-[calc(100vh-68px)] p-4 flex flex-col justify-between overflow-y-auto z-30 select-none text-slate-200 font-sans">
      <div className="space-y-4">
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
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-950 border border-emerald-600 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-900 transition-colors animate-pulse"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>CLOSE CIRCUIT LOOP</span>
          </button>
        )}

        {/* Section 0: Templates & Map Tracing */}
        <div className="bg-[#121721] p-3 rounded-xl border border-[#1E2638] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>TEMPLATES & MAP TRACING</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
            <button
              onClick={onOpenPresets}
              className="py-2 px-2.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-700/80 text-cyan-300 font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              title="Load Pre-built Circuit Archetypes"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>PRESETS</span>
            </button>

            <button
              onClick={onToggleUnderlay}
              className={`py-2 px-2.5 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-colors ${
                isUnderlayOpen || track.underlay
                  ? 'bg-purple-950/80 border-purple-600 text-purple-300'
                  : 'bg-[#18202F] border-[#243046] text-slate-300 hover:text-slate-100 hover:bg-slate-800'
              }`}
              title="Upload & Trace Real Satellite Imagery"
            >
              <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>UNDERLAY</span>
            </button>
          </div>
        </div>

        {/* Section 1: Studio Tool Palette (Draw, Edit, Erase, Pan) */}
        <div className="bg-[#121721] p-3 rounded-xl border border-[#1E2638] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>TOOL PALETTE</span>
            <span className="text-[10px] text-slate-500 font-mono">[P, E, X, Space]</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => setActiveTool('draw')}
              className={`p-2 rounded-lg font-mono text-xs flex flex-col items-center justify-center gap-1 border transition-all ${
                activeTool === 'draw'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-sm'
                  : 'bg-[#18202F] border-[#243046] text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Draw Tool (P): Click to lay points"
            >
              <PenTool className="w-4 h-4" />
              <span className="text-[10px] font-bold">Draw</span>
            </button>

            <button
              onClick={() => setActiveTool('edit')}
              className={`p-2 rounded-lg font-mono text-xs flex flex-col items-center justify-center gap-1 border transition-all ${
                activeTool === 'edit'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-sm'
                  : 'bg-[#18202F] border-[#243046] text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Edit Tool (E): Drag, box-select, nudge points"
            >
              <Move className="w-4 h-4" />
              <span className="text-[10px] font-bold">Edit</span>
            </button>

            <button
              onClick={() => setActiveTool('erase')}
              className={`p-2 rounded-lg font-mono text-xs flex flex-col items-center justify-center gap-1 border transition-all ${
                activeTool === 'erase'
                  ? 'bg-red-950 border-red-500 text-red-300 shadow-sm'
                  : 'bg-[#18202F] border-[#243046] text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Erase Tool (X): Click nodes to delete"
            >
              <Eraser className="w-4 h-4" />
              <span className="text-[10px] font-bold">Erase</span>
            </button>

            <button
              onClick={() => setActiveTool('pan')}
              className={`p-2 rounded-lg font-mono text-xs flex flex-col items-center justify-center gap-1 border transition-all ${
                activeTool === 'pan'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-sm'
                  : 'bg-[#18202F] border-[#243046] text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Pan Tool (Space-drag or Middle Click)"
            >
              <Hand className="w-4 h-4" />
              <span className="text-[10px] font-bold">Pan</span>
            </button>
          </div>
        </div>

        {/* Section 2: Viewport & Snapping Controls */}
        <div className="bg-[#121721] p-3 rounded-xl border border-[#1E2638] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>VIEW & GRID</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
            <button
              onClick={onToggleSnap}
              className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1.5 transition-colors ${
                snapEnabled
                  ? 'bg-cyan-950/70 border-cyan-600 text-cyan-300'
                  : 'bg-[#18202F] border-[#243046] text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Grid Snapping (20m)"
            >
              <Magnet className="w-3.5 h-3.5" />
              <span>{snapEnabled ? 'SNAP ON' : 'SNAP OFF'}</span>
            </button>

            <button
              onClick={onZoomFit}
              className="py-1.5 px-2 rounded-lg bg-[#18202F] hover:bg-slate-800 text-slate-300 border border-[#243046] flex items-center justify-center gap-1.5 transition-colors"
              title="Zoom to Fit Track (F)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>FIT (F)</span>
            </button>

            <button
              onClick={onToggleHistoryPanel}
              className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1.5 transition-colors ${
                isHistoryPanelOpen
                  ? 'bg-cyan-950/70 border-cyan-600 text-cyan-300'
                  : 'bg-[#18202F] border-[#243046] text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Edit History Panel"
            >
              <History className="w-3.5 h-3.5" />
              <span>HISTORY</span>
            </button>
          </div>
        </div>

        {/* Section 3: Selection Inspector (Lock, Start/Finish, Delete) */}
        {selectedCount > 0 && (
          <div className="bg-[#121721] p-3 rounded-xl border border-cyan-900/50 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
                SELECTED: {selectedCount} NODE{selectedCount > 1 ? 'S' : ''}
              </span>
              {primarySelectedNode?.locked && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                  LOCKED
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={handleToggleLock}
                className="py-1.5 px-2 rounded-lg bg-[#18202F] hover:bg-slate-800 text-slate-200 border border-[#243046] flex items-center justify-center gap-1.5 font-medium transition-colors"
              >
                {primarySelectedNode?.locked ? <Unlock className="w-3.5 h-3.5 text-amber-400" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{primarySelectedNode?.locked ? 'Unlock' : 'Lock Position'}</span>
              </button>

              <button
                onClick={handleSetStartFinish}
                className="py-1.5 px-2 rounded-lg bg-[#18202F] hover:bg-slate-800 text-emerald-400 border border-[#243046] flex items-center justify-center gap-1.5 font-medium transition-colors"
                title="Move Start / Finish Line to this node"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Set S/F Line</span>
              </button>
            </div>

            <button
              onClick={handleDeleteSelected}
              className="w-full py-1.5 px-3 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 font-semibold flex items-center justify-center gap-1.5 border border-red-900/60 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>DELETE {selectedCount > 1 ? `ALL ${selectedCount} POINTS` : 'POINT'}</span>
            </button>
          </div>
        )}

        {/* Section 4: Undo, Redo, Clear */}
        <div className="bg-[#121721] p-3 rounded-xl border border-[#1E2638] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>HISTORY ACTIONS</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="py-1.5 px-2 rounded-lg bg-[#18202F] hover:bg-slate-800 text-slate-200 font-semibold flex items-center justify-center gap-1 border border-[#243046] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-3.5 h-3.5" /> UNDO
            </button>

            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="py-1.5 px-2 rounded-lg bg-[#18202F] hover:bg-slate-800 text-slate-200 font-semibold flex items-center justify-center gap-1 border border-[#243046] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="w-3.5 h-3.5" /> REDO
            </button>

            <button
              onClick={onClearTrack}
              disabled={track.nodes.length === 0}
              className="py-1.5 px-2 rounded-lg bg-[#18202F] hover:bg-slate-800 text-slate-300 font-semibold flex items-center justify-center gap-1 border border-[#243046] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Clear Canvas"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> CLEAR
            </button>
          </div>
        </div>

        {/* Section 5: Track Width Adjustment */}
        <div className="bg-[#121721] p-3 rounded-xl border border-[#1E2638] space-y-2 font-mono text-xs">
          <div className="flex justify-between text-slate-300 font-sans">
            <span className="flex items-center gap-1.5 font-bold text-slate-400">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> ROAD WIDTH
            </span>
            <span className="font-bold text-cyan-400 font-mono">{track.defaultWidth}m</span>
          </div>

          <input
            type="range"
            min="10"
            max="40"
            step="1"
            value={track.defaultWidth}
            onChange={(e) => handleWidthChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-[#1E2638] rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
          />
        </div>

        {/* Section 6: Circuit Telemetry Summary */}
        <div className="bg-[#121721] p-3 rounded-xl border border-[#1E2638] space-y-2 font-mono text-xs">
          <div className="flex justify-between items-center py-1 border-b border-[#1E2638]">
            <span className="text-slate-400 font-sans">TRACK LENGTH</span>
            <span className="font-bold text-slate-200">
              {isValidTrack ? `${(circuitLength / 1000).toFixed(3)} km` : '—'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-[#1E2638]">
            <span className="text-slate-400 font-sans">CORNERS / TURNS</span>
            <span className="font-bold text-emerald-400">
              {stats ? `${stats.cornerCount} TURNS` : '—'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-[#1E2638]">
            <span className="text-slate-400 font-sans">ELEVATION DELTA</span>
            <span className="font-bold text-purple-400">
              {stats ? `Δ ${stats.elevationDeltaMeters}m` : '—'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-[#1E2638]">
            <span className="text-slate-400 font-sans">CONTROL POINTS</span>
            <span className="font-bold text-slate-200">
              {track.nodes.length > 0 ? `${track.nodes.length} NODES` : '—'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400 font-sans">EST. LAP TIME</span>
            <span className="font-bold text-slate-200">
              {estimatedTime !== null ? `${estimatedTime.toFixed(1)} s` : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-[#1E2638] text-[10px] text-slate-500 font-mono text-center">
        Antigravity GP • Shape Studio
      </div>
    </div>
  );
};
