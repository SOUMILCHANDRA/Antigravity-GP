import React from 'react';
import { 
  X, 
  Mountain, 
  Layers, 
  Compass, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Flag, 
  Trash2, 
  RotateCcw,
  Sliders,
  Sparkles
} from 'lucide-react';
import { TrackConfig, TrackNode } from '../../types/track';
import { CornerInfo } from '../../utils/trackAnalysis';

interface PointInspectorProps {
  track: TrackConfig;
  setTrack: (updater: TrackConfig | ((prev: TrackConfig) => TrackConfig), actionDescription?: string) => void;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  setSelectedNodeId: (id: string | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  corners: CornerInfo[];
  onMoveStartLine: (nodeId: string) => void;
}

export const PointInspector: React.FC<PointInspectorProps> = ({
  track,
  setTrack,
  selectedNodeId,
  selectedNodeIds,
  setSelectedNodeId,
  setSelectedNodeIds,
  corners,
  onMoveStartLine
}) => {
  const activeSelectedSet = new Set(selectedNodeIds);
  if (selectedNodeId) activeSelectedSet.add(selectedNodeId);

  const selectedCount = activeSelectedSet.size;
  if (selectedCount === 0) return null;

  // Selected nodes list
  const selectedNodes = track.nodes.filter(n => activeSelectedSet.has(n.id));
  const primaryNode = selectedNodes[0];
  if (!primaryNode) return null;

  const isMulti = selectedCount > 1;

  // Find if this primary node corresponds to a detected corner
  const cornerData = corners.find(c => c.nodeId === primaryNode.id);

  // Common values or fallback to primary node
  const currentElevation = primaryNode.elevation ?? 0;
  const currentWidth = primaryNode.width ?? track.defaultWidth;
  const currentBanking = primaryNode.banking ?? 0;
  const currentRunoff = primaryNode.runoffWidth ?? 8.5;
  const isLocked = primaryNode.locked ?? false;
  const cornerName = primaryNode.cornerName || (cornerData ? cornerData.name : `Point ${track.nodes.findIndex(n => n.id === primaryNode.id) + 1}`);

  // Handlers for updating attributes
  const updateAttribute = (
    attribute: keyof TrackNode,
    value: any,
    label: string
  ) => {
    setTrack(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => {
        if (activeSelectedSet.has(n.id)) {
          return { ...n, [attribute]: value };
        }
        return n;
      })
    }), `${label} for ${isMulti ? `${selectedCount} points` : cornerName}`);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTrack(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === primaryNode.id ? { ...n, cornerName: val } : n)
    }));
  };

  const handleToggleLock = () => {
    const nextLocked = !isLocked;
    updateAttribute('locked', nextLocked, nextLocked ? 'Lock' : 'Unlock');
  };

  const handleDelete = () => {
    setTrack(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => !activeSelectedSet.has(n.id)),
      isClosed: prev.nodes.length - activeSelectedSet.size < 3 ? false : prev.isClosed
    }), `Delete ${selectedCount} point(s)`);
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
  };

  const handleResetElevation = () => updateAttribute('elevation', 0, 'Reset elevation');
  const handleResetBanking = () => updateAttribute('banking', 0, 'Reset banking');
  const handleResetRunoff = () => updateAttribute('runoffWidth', 8.5, 'Reset runoff width');

  return (
    <div className="absolute top-4 left-4 z-40 w-80 bg-[#101522]/95 backdrop-blur-md border border-[#222C3E] rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-200 select-none animate-in fade-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="px-4 py-3 bg-[#151C2C] border-b border-[#222C3E] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs font-bold font-mono tracking-wider text-cyan-400 uppercase">
              {isMulti ? `MULTI-SELECTION (${selectedCount})` : 'POINT INSPECTOR'}
            </span>
            {cornerData && !isMulti && (
              <span className="text-[10px] text-slate-400 font-mono">
                Radius: {cornerData.radius}m • {cornerData.direction === 'left' ? 'Left Turn' : 'Right Turn'}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedNodeId(null);
            setSelectedNodeIds([]);
          }}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Close Inspector (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto text-xs">
        {/* Corner Name (Single selection only) */}
        {!isMulti && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono flex items-center justify-between">
              <span>CORNER / POINT NAME</span>
              <span className="text-slate-500 font-normal">Index #{track.nodes.findIndex(n => n.id === primaryNode.id) + 1}</span>
            </label>
            <input
              type="text"
              value={cornerName}
              onChange={handleNameChange}
              placeholder="e.g. Turn 1, Hairpin, Chicane"
              className="w-full bg-[#18202F] border border-[#243046] focus:border-cyan-500 rounded-lg px-3 py-1.5 text-slate-200 font-medium focus:outline-none transition-colors"
            />
          </div>
        )}

        {/* Elevation Slider (-15m to +50m) */}
        <div className="bg-[#141A28] p-3 rounded-xl border border-[#1E2638] space-y-2">
          <div className="flex justify-between items-center font-mono">
            <span className="flex items-center gap-1.5 text-slate-300 font-sans font-semibold">
              <Mountain className="w-3.5 h-3.5 text-emerald-400" />
              <span>ELEVATION</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-emerald-400">
                {currentElevation > 0 ? `+${currentElevation}m` : `${currentElevation}m`}
              </span>
              {currentElevation !== 0 && (
                <button
                  onClick={handleResetElevation}
                  title="Reset to 0m"
                  className="p-0.5 hover:text-emerald-300 text-slate-500"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <input
            type="range"
            min="-15"
            max="50"
            step="1"
            value={currentElevation}
            onChange={(e) => updateAttribute('elevation', parseInt(e.target.value), 'Set elevation')}
            className="w-full h-1.5 bg-[#1E2638] rounded-lg appearance-none cursor-pointer accent-[#10B981]"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-15m (Dip)</span>
            <span>0m (Level)</span>
            <span>+50m (Crest)</span>
          </div>
        </div>

        {/* Banking Angle Slider (-20 deg to +25 deg) */}
        <div className="bg-[#141A28] p-3 rounded-xl border border-[#1E2638] space-y-2">
          <div className="flex justify-between items-center font-mono">
            <span className="flex items-center gap-1.5 text-slate-300 font-sans font-semibold">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>BANKING TILT</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-amber-400">
                {currentBanking > 0 ? `+${currentBanking}°` : `${currentBanking}°`}
              </span>
              {currentBanking !== 0 && (
                <button
                  onClick={handleResetBanking}
                  title="Reset to 0°"
                  className="p-0.5 hover:text-amber-300 text-slate-500"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <input
            type="range"
            min="-20"
            max="25"
            step="1"
            value={currentBanking}
            onChange={(e) => updateAttribute('banking', parseInt(e.target.value), 'Set banking')}
            className="w-full h-1.5 bg-[#1E2638] rounded-lg appearance-none cursor-pointer accent-[#F59E0B]"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-20° (Off-camber)</span>
            <span>0° (Flat)</span>
            <span>+25° (Indy/Monza)</span>
          </div>
        </div>

        {/* Per-point Width Slider (10m to 40m) */}
        <div className="bg-[#141A28] p-3 rounded-xl border border-[#1E2638] space-y-2">
          <div className="flex justify-between items-center font-mono">
            <span className="flex items-center gap-1.5 text-slate-300 font-sans font-semibold">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>TRACK WIDTH</span>
            </span>
            <span className="font-bold text-cyan-400">
              {currentWidth}m
            </span>
          </div>

          <input
            type="range"
            min="10"
            max="40"
            step="1"
            value={currentWidth}
            onChange={(e) => updateAttribute('width', parseInt(e.target.value), 'Set width')}
            className="w-full h-1.5 bg-[#1E2638] rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>10m (Narrow)</span>
            <span>14m (Standard)</span>
            <span>40m (Wide Apex)</span>
          </div>
        </div>

        {/* Gravel / Sand Runoff Width (2m to 30m) */}
        <div className="bg-[#141A28] p-3 rounded-xl border border-[#1E2638] space-y-2">
          <div className="flex justify-between items-center font-mono">
            <span className="flex items-center gap-1.5 text-slate-300 font-sans font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
              <span>RUN-OFF GRAVEL TRAP</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-orange-400">
                {currentRunoff}m
              </span>
              {currentRunoff !== 8.5 && (
                <button
                  onClick={handleResetRunoff}
                  title="Reset to 8.5m"
                  className="p-0.5 hover:text-orange-300 text-slate-500"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <input
            type="range"
            min="2"
            max="30"
            step="0.5"
            value={currentRunoff}
            onChange={(e) => updateAttribute('runoffWidth', parseFloat(e.target.value), 'Set runoff width')}
            className="w-full h-1.5 bg-[#1E2638] rounded-lg appearance-none cursor-pointer accent-[#FB923C]"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>2m (Street)</span>
            <span>8.5m (Standard)</span>
            <span>30m (Heavy Braking)</span>
          </div>
        </div>

        {/* Actions Toolbar */}
        <div className="pt-2 border-t border-[#1E2638] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleToggleLock}
              className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition-colors ${
                isLocked
                  ? 'bg-amber-950/80 border-amber-600 text-amber-300 hover:bg-amber-900'
                  : 'bg-[#18202F] border-[#243046] text-slate-300 hover:bg-slate-800'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
              <span>{isLocked ? 'Locked' : 'Lock Point'}</span>
            </button>

            {!isMulti && (
              <button
                onClick={() => onMoveStartLine(primaryNode.id)}
                className="py-2 px-3 rounded-xl bg-[#18202F] hover:bg-emerald-950/80 text-emerald-400 border border-[#243046] hover:border-emerald-600 flex items-center justify-center gap-1.5 font-semibold transition-colors"
                title="Move Start/Finish Line here"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Set S/F Line</span>
              </button>
            )}
          </div>

          <button
            onClick={handleDelete}
            className="w-full py-2 px-3 rounded-xl bg-red-950/60 hover:bg-red-900/90 text-red-300 border border-red-900/80 flex items-center justify-center gap-1.5 font-bold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>DELETE {isMulti ? `${selectedCount} POINTS` : 'POINT'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
