import React from 'react';
import { X, Play, Compass, Mountain, Ruler, Flag, Layers, Sparkles } from 'lucide-react';
import { TrackConfig } from '../../types/track';
import { CIRCUIT_PRESETS } from '../../utils/presets';

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: TrackConfig) => void;
}

export const PresetModal: React.FC<PresetModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset
}) => {
  if (!isOpen) return null;

  return (
    <div className="pro-modal fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans animate-in fade-in duration-200">
      <div className="bg-[#0F1420] border border-[#222C3E] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#141B2B] border-b border-[#222C3E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide">
                CIRCUIT PRESETS
              </h2>
              <p className="text-xs text-slate-400">
                Map-derived circuit layouts, ready to customize or race.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Cards Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          {CIRCUIT_PRESETS.map((preset) => {
            const nodeCount = preset.nodes.length;
            let maxElev = 0;
            let minElev = 0;
            let maxBank = 0;
            preset.nodes.forEach(n => {
              maxElev = Math.max(maxElev, n.elevation || 0);
              minElev = Math.min(minElev, n.elevation || 0);
              maxBank = Math.max(maxBank, Math.abs(n.banking || 0));
            });
            const elevDelta = Math.round(maxElev - minElev);

            return (
              <div
                key={preset.id}
                role="button"
                tabIndex={0}
                aria-label={`Load ${preset.name}`}
                onClick={() => {
                  onSelectPreset(preset);
                  onClose();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectPreset(preset);
                    onClose();
                  }
                }}
                className="group relative bg-[#131927] hover:bg-[#182133] border border-[#20293D] hover:border-cyan-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between shadow-lg hover:shadow-cyan-500/10"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {preset.name}
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 shrink-0">
                      {preset.dressing?.sponsorName || 'CHAMPIONSHIP'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                    {preset.id === 'preset-spa-francorchamps' && 'Belgian Grand Prix layout · 7.004 km · map-derived centerline.'}
                    {preset.id === 'preset-monaco-street' && 'Monaco Grand Prix street layout · 3.337 km · map-derived centerline.'}
                    {preset.id === 'preset-suzuka-figure8' && 'Japanese Grand Prix layout · 5.807 km · includes the elevated crossover bridge.'}
                    {preset.id === 'preset-monza-temple-of-speed' && 'Italian Grand Prix layout · 5.793 km · map-derived centerline.'}
                    {preset.id === 'preset-gp-international' && 'São Paulo Grand Prix at Interlagos · 4.309 km · map-derived centerline.'}
                    {preset.id === 'preset-tri-oval' && 'Daytona tri-oval · 2.5 mi · locally authored shape scaled to the published lap distance.'}
                    {preset.id === 'preset-bathurst-mountain' && 'Mount Panorama · 6.213 km · anticlockwise layout with an authored mountain elevation profile.'}
                    {preset.id === 'preset-technical-arena' && 'Hungaroring · 4.381 km · map-derived centerline.'}
                    {preset.id === 'preset-roval-course' && 'Charlotte Motor Speedway Roval · 2.28 mi · map-derived centerline.'}
                    {preset.id === 'preset-karting-championship' && 'Original Antigravity GP karting test layout.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1C2538] flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Flag className="w-3 h-3 text-emerald-400" />
                      <span>{nodeCount} Nodes</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Mountain className="w-3 h-3 text-purple-400" />
                      <span>Δ {elevDelta}m</span>
                    </span>
                    {maxBank > 0 && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Compass className="w-3 h-3" />
                        <span>{maxBank}° Bank</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform">
                    <span>LOAD</span>
                    <Play className="w-3 h-3 fill-current" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#141B2B] border-t border-[#222C3E] text-xs text-slate-500 font-mono flex items-center justify-between">
          <span>Antigravity GP • Circuit Studio Presets</span>
          <span>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
};
