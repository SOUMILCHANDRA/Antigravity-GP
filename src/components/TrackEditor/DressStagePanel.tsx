import React from 'react';
import { 
  Palette, 
  Flag, 
  Building2, 
  ShieldAlert, 
  Sparkles, 
  Trash2, 
  Check, 
  Gauge, 
  Layers, 
  Eye,
  Sliders
} from 'lucide-react';
import { 
  TrackConfig, 
  CurbStyle, 
  AsphaltStyle, 
  RunoffStyle, 
  VenueFacility 
} from '../../types/track';
import { CornerInfo } from '../../utils/trackAnalysis';

interface DressStagePanelProps {
  track: TrackConfig;
  setTrack: (updater: TrackConfig | ((prev: TrackConfig) => TrackConfig), actionDescription?: string) => void;
  corners: CornerInfo[];
}

export const DressStagePanel: React.FC<DressStagePanelProps> = ({
  track,
  setTrack,
  corners
}) => {
  const currentDressing = track.dressing || {
    curbStyle: 'red_white',
    asphaltStyle: 'modern_f1',
    runoffStyle: 'gravel_trap',
    sponsorName: 'ANTIGRAVITY GRAND PRIX'
  };

  const pitLane = track.pitLane || {
    enabled: true,
    entryT: 0.93,
    exitT: 0.07,
    speedLimitKmh: 80,
    pitBoxes: 10,
    side: 'right',
    width: 7.5
  };

  const facilities = track.facilities || [];

  // Update Dressing
  const updateDressing = (fields: Partial<typeof currentDressing>, label: string) => {
    setTrack(prev => ({
      ...prev,
      dressing: {
        ...(prev.dressing || currentDressing),
        ...fields
      }
    }), label);
  };

  // Update Pit Lane
  const updatePitLane = (fields: Partial<typeof pitLane>, label: string) => {
    setTrack(prev => ({
      ...prev,
      pitLane: {
        ...(prev.pitLane || pitLane),
        ...fields
      }
    }), label);
  };

  // Smart Auto-Dress Circuit
  const handleAutoDress = () => {
    const newFacilities: VenueFacility[] = [];

    // 1. Start Gantry over S/F Line
    newFacilities.push({
      id: `fac-gantry-${Date.now()}`,
      type: 'gantry',
      splineT: 0,
      side: 'free',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    });

    // 2. Main Covered Grandstand along the straight
    newFacilities.push({
      id: `fac-grandstand-main-${Date.now()}`,
      type: 'grandstand',
      splineT: 0.02,
      side: pitLane.side === 'right' ? 'left' : 'right',
      seats: 3500,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 14, y: 1, z: 1 }
    });

    // 3. 2-Story Pit Building & Team Garages along pit lane
    if (pitLane.enabled) {
      newFacilities.push({
        id: `fac-pitbuilding-${Date.now()}`,
        type: 'pit_building',
        splineT: 0.98,
        side: pitLane.side,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 18, y: 1, z: 1 }
      });
    }

    // 4. Tire Barriers outside tight corners (radius < 120m)
    corners.slice(0, 6).forEach((c, idx) => {
      if (c.radius < 140) {
        newFacilities.push({
          id: `fac-barrier-${c.nodeId}-${idx}`,
          type: 'tire_barrier',
          splineT: (c.nodeIndex + 0.5) / Math.max(1, track.nodes.length),
          side: c.direction === 'left' ? 'right' : 'left',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 8, y: 1, z: 1 }
        });
      }
    });

    // 5. Sponsor Boards along corner exits
    corners.slice(0, 4).forEach((c, idx) => {
      newFacilities.push({
        id: `fac-sponsor-${idx}`,
        type: 'sponsor_board',
        splineT: (c.nodeIndex + 0.8) / Math.max(1, track.nodes.length),
        side: c.direction === 'left' ? 'right' : 'left',
        label: 'ANTIGRAVITY',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 10, y: 1, z: 1 }
      });
    });

    // 6. Safety Marshal Posts
    if (track.nodes.length >= 4) {
      newFacilities.push({
        id: `fac-marshal-1`,
        type: 'marshal_post',
        splineT: 0.25,
        side: 'left',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      });
      newFacilities.push({
        id: `fac-marshal-2`,
        type: 'marshal_post',
        splineT: 0.65,
        side: 'right',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      });
    }

    setTrack(prev => ({
      ...prev,
      facilities: newFacilities,
      pitLane: {
        ...(prev.pitLane || pitLane),
        enabled: true
      }
    }), 'Auto-dress circuit with facilities and pit lane');
  };

  const handleClearFacilities = () => {
    setTrack(prev => ({
      ...prev,
      facilities: []
    }), 'Clear venue facilities');
  };

  return (
    <div className="studio-dress-panel absolute top-4 left-4 z-40 w-84 bg-[#101522]/95 backdrop-blur-md border border-[#222C3E] rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-200 select-none animate-in fade-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="px-4 py-3 bg-[#151C2C] border-b border-[#222C3E] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-purple-400" />
          <div className="flex flex-col">
            <span className="text-xs font-bold font-mono tracking-wider text-purple-400 uppercase">
              DRESS STAGE: VENUE & STYLING
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Curbs, Pit Lane, Runoffs & 3D Facilities
            </span>
          </div>
        </div>

        <button
          onClick={handleAutoDress}
          className="py-1 px-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-slate-950 font-bold text-[10px] font-mono flex items-center gap-1 shadow-md transition-all cursor-pointer"
          title="Auto-place Grandstands, Pit Building, and Safety Barriers"
        >
          <Sparkles className="w-3 h-3 fill-current" />
          <span>AUTO-DRESS</span>
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto text-xs">
        {/* Section 1: Kerb Styling */}
        <div className="bg-[#141A28] p-3 rounded-xl border border-[#1E2638] space-y-2">
          <div className="flex items-center justify-between font-mono">
            <span className="font-bold text-slate-300 font-sans flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>KERB STYLE</span>
            </span>
            <span className="text-[10px] text-cyan-400 uppercase font-mono">
              {currentDressing.curbStyle.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
            {[
              { id: 'red_white', name: 'FIA Red / White', c1: '#E10600', c2: '#FFFFFF' },
              { id: 'blue_yellow', name: 'Paul Ricard Blue/Yellow', c1: '#0055D4', c2: '#FFD200' },
              { id: 'green_white', name: 'Classic Green/White', c1: '#00873D', c2: '#FFFFFF' },
              { id: 'monza_black_yellow', name: 'Monza Black/Yellow', c1: '#18181B', c2: '#FFD200' }
            ].map(k => (
              <button
                key={k.id}
                onClick={() => updateDressing({ curbStyle: k.id as CurbStyle }, `Set kerb to ${k.name}`)}
                className={`p-2 rounded-lg border flex items-center gap-2 transition-colors ${
                  currentDressing.curbStyle === k.id
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                    : 'bg-[#18202F] border-[#243046] text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex w-4 h-4 rounded overflow-hidden shrink-0 border border-slate-700">
                  <div className="w-2 h-full" style={{ backgroundColor: k.c1 }} />
                  <div className="w-2 h-full" style={{ backgroundColor: k.c2 }} />
                </div>
                <span className="truncate">{k.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Asphalt Surface & Runoff */}
        <div className="bg-[#141A28] p-3 rounded-xl border border-[#1E2638] space-y-2">
          <div className="flex items-center justify-between font-mono">
            <span className="font-bold text-slate-300 font-sans flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span>ASPHALT & RUNOFF TYPE</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Track Surface Texture</label>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
              {[
                { id: 'modern_f1', name: 'Modern F1 Dark' },
                { id: 'classic_weathered', name: 'Classic Tarmac' },
                { id: 'street_concrete', name: 'Street Concrete' },
                { id: 'night_circuit', name: 'Night Gloss' }
              ].map(a => (
                <button
                  key={a.id}
                  onClick={() => updateDressing({ asphaltStyle: a.id as AsphaltStyle }, `Set asphalt to ${a.name}`)}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                    currentDressing.asphaltStyle === a.id
                      ? 'bg-purple-950/80 border-purple-500 text-purple-300 font-bold'
                      : 'bg-[#18202F] border-[#243046] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Run-Off Safety Zone</label>
            <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
              {[
                { id: 'gravel_trap', name: 'Gravel Trap' },
                { id: 'asphalt_stripes', name: 'Paul Ricard' },
                { id: 'grass_verge', name: 'Grass Verge' }
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => updateDressing({ runoffStyle: r.id as RunoffStyle }, `Set runoff to ${r.name}`)}
                  className={`py-1.5 px-1 rounded-lg border text-center transition-colors text-[10px] ${
                    currentDressing.runoffStyle === r.id
                      ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold'
                      : 'bg-[#18202F] border-[#243046] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Pit Lane Configuration */}
        <div className="bg-[#141A28] p-3 rounded-xl border border-[#1E2638] space-y-2.5">
          <div className="flex items-center justify-between font-mono">
            <span className="font-bold text-slate-300 font-sans flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span>PIT LANE ARCHITECTURE</span>
            </span>
            <button
              onClick={() => updatePitLane({ enabled: !pitLane.enabled }, pitLane.enabled ? 'Disable pit lane' : 'Enable pit lane')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                pitLane.enabled ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {pitLane.enabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          {pitLane.enabled && (
            <div className="space-y-2 font-mono text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">Side of Main Straight</div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => updatePitLane({ side: 'left' }, 'Set pit lane left')}
                      className={`py-1 rounded border text-[11px] ${
                        pitLane.side === 'left' ? 'bg-cyan-950 border-cyan-600 text-cyan-300 font-bold' : 'bg-[#18202F] border-[#243046] text-slate-400'
                      }`}
                    >
                      Left
                    </button>
                    <button
                      onClick={() => updatePitLane({ side: 'right' }, 'Set pit lane right')}
                      className={`py-1 rounded border text-[11px] ${
                        pitLane.side === 'right' ? 'bg-cyan-950 border-cyan-600 text-cyan-300 font-bold' : 'bg-[#18202F] border-[#243046] text-slate-400'
                      }`}
                    >
                      Right
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 mb-1">Speed Limiter</div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => updatePitLane({ speedLimitKmh: 60 }, 'Set pit speed 60 km/h')}
                      className={`py-1 rounded border text-[11px] ${
                        pitLane.speedLimitKmh === 60 ? 'bg-amber-950 border-amber-600 text-amber-300 font-bold' : 'bg-[#18202F] border-[#243046] text-slate-400'
                      }`}
                    >
                      60 km/h
                    </button>
                    <button
                      onClick={() => updatePitLane({ speedLimitKmh: 80 }, 'Set pit speed 80 km/h')}
                      className={`py-1 rounded border text-[11px] ${
                        pitLane.speedLimitKmh === 80 ? 'bg-amber-950 border-amber-600 text-amber-300 font-bold' : 'bg-[#18202F] border-[#243046] text-slate-400'
                      }`}
                    >
                      80 km/h
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Team Garages / Stalls</span>
                  <span className="text-emerald-400 font-bold">{pitLane.pitBoxes || 10} Garages</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="14"
                  step="1"
                  value={pitLane.pitBoxes || 10}
                  onChange={(e) => updatePitLane({ pitBoxes: parseInt(e.target.value) }, 'Set pit stall count')}
                  className="w-full h-1.5 bg-[#1E2638] rounded-lg appearance-none cursor-pointer accent-[#10B981]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 4: 3D Venue Facilities Library */}
        <div className="bg-[#141A28] p-3 rounded-xl border border-[#1E2638] space-y-2">
          <div className="flex items-center justify-between font-mono">
            <span className="font-bold text-slate-300 font-sans flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>3D VENUE FACILITIES</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">
              {facilities.length} Placed
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
            <button
              onClick={() => {
                const fac: VenueFacility = {
                  id: `fac-grandstand-${Date.now()}`,
                  type: 'grandstand',
                  splineT: 0.05,
                  side: 'left',
                  seats: 1200,
                  position: { x: 0, y: 0, z: 0 },
                  rotation: { x: 0, y: 0, z: 0 },
                  scale: { x: 12, y: 1, z: 1 }
                };
                setTrack(prev => ({
                  ...prev,
                  facilities: [...(prev.facilities || []), fac]
                }), 'Add Grandstand');
              }}
              className="py-1.5 px-2 rounded-lg bg-[#18202F] hover:bg-slate-800 text-slate-200 border border-[#243046] flex items-center justify-center gap-1 transition-colors"
            >
              + Grandstand
            </button>

            <button
              onClick={() => {
                const fac: VenueFacility = {
                  id: `fac-pit-${Date.now()}`,
                  type: 'pit_building',
                  splineT: 0.98,
                  side: 'right',
                  position: { x: 0, y: 0, z: 0 },
                  rotation: { x: 0, y: 0, z: 0 },
                  scale: { x: 16, y: 1, z: 1 }
                };
                setTrack(prev => ({
                  ...prev,
                  facilities: [...(prev.facilities || []), fac]
                }), 'Add Pit Building');
              }}
              className="py-1.5 px-2 rounded-lg bg-[#18202F] hover:bg-slate-800 text-slate-200 border border-[#243046] flex items-center justify-center gap-1 transition-colors"
            >
              + Pit Building
            </button>

            <button
              onClick={() => {
                const fac: VenueFacility = {
                  id: `fac-barrier-${Date.now()}`,
                  type: 'tire_barrier',
                  splineT: 0.15,
                  side: 'right',
                  position: { x: 0, y: 0, z: 0 },
                  rotation: { x: 0, y: 0, z: 0 },
                  scale: { x: 8, y: 1, z: 1 }
                };
                setTrack(prev => ({
                  ...prev,
                  facilities: [...(prev.facilities || []), fac]
                }), 'Add Tire Barrier');
              }}
              className="py-1.5 px-2 rounded-lg bg-[#18202F] hover:bg-slate-800 text-slate-200 border border-[#243046] flex items-center justify-center gap-1 transition-colors"
            >
              + Tire Barrier
            </button>

            <button
              onClick={() => {
                const fac: VenueFacility = {
                  id: `fac-sponsor-${Date.now()}`,
                  type: 'sponsor_board',
                  splineT: 0.20,
                  side: 'left',
                  label: 'ANTIGRAVITY',
                  position: { x: 0, y: 0, z: 0 },
                  rotation: { x: 0, y: 0, z: 0 },
                  scale: { x: 10, y: 1, z: 1 }
                };
                setTrack(prev => ({
                  ...prev,
                  facilities: [...(prev.facilities || []), fac]
                }), 'Add Sponsor Board');
              }}
              className="py-1.5 px-2 rounded-lg bg-[#18202F] hover:bg-slate-800 text-slate-200 border border-[#243046] flex items-center justify-center gap-1 transition-colors"
            >
              + Sponsor Board
            </button>
          </div>

          {facilities.length > 0 && (
            <button
              onClick={handleClearFacilities}
              className="w-full mt-2 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/80 text-red-300 border border-red-900/60 font-mono text-[10px] flex items-center justify-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear All {facilities.length} Facilities</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
