import React, { useState, useRef } from 'react';
import { 
  X, 
  Image as ImageIcon, 
  Upload, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Ruler, 
  RotateCw, 
  ZoomIn, 
  Trash2, 
  Move,
  CheckCircle2
} from 'lucide-react';
import { TrackConfig, MapUnderlayConfig } from '../../types/track';

interface MapUnderlayPanelProps {
  isOpen: boolean;
  onClose: () => void;
  track: TrackConfig;
  setTrack: (updater: TrackConfig | ((prev: TrackConfig) => TrackConfig), actionDescription?: string) => void;
  isCalibrating: boolean;
  setIsCalibrating: (val: boolean) => void;
  calibrationPoints: [{ x: number; y: number } | null, { x: number; y: number } | null];
  onResetCalibration: () => void;
  onApplyCalibrationDistance: (meters: number) => void;
}

export const MapUnderlayPanel: React.FC<MapUnderlayPanelProps> = ({
  isOpen,
  onClose,
  track,
  setTrack,
  isCalibrating,
  setIsCalibrating,
  calibrationPoints,
  onResetCalibration,
  onApplyCalibrationDistance
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [knownMetersInput, setKnownMetersInput] = useState<string>('500');

  if (!isOpen) return null;

  const underlay = track.underlay;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setTrack(prev => ({
        ...prev,
        underlay: {
          imageUrl: dataUrl,
          opacity: 0.5,
          visible: true,
          locked: false,
          x: 0,
          y: 0,
          scale: 1.0,
          rotation: 0
        }
      }), 'Upload map underlay');
    };
    reader.readAsDataURL(file);
  };

  const updateUnderlay = (fields: Partial<MapUnderlayConfig>, desc: string) => {
    if (!underlay) return;
    setTrack(prev => ({
      ...prev,
      underlay: {
        ...prev.underlay!,
        ...fields
      }
    }), desc);
  };

  const handleClearUnderlay = () => {
    setTrack(prev => ({
      ...prev,
      underlay: undefined
    }), 'Remove map underlay');
    setIsCalibrating(false);
    onResetCalibration();
  };

  const hasPoint1 = calibrationPoints[0] !== null;
  const hasPoint2 = calibrationPoints[1] !== null;

  return (
    <div className="absolute top-4 right-84 z-40 w-80 bg-[#101522]/95 backdrop-blur-md border border-[#222C3E] rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-200 select-none animate-in fade-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-4 py-3 bg-[#151C2C] border-b border-[#222C3E] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold font-mono tracking-wider text-slate-200 uppercase">
            MAP TRACING UNDERLAY
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto text-xs">
        {/* If no underlay loaded, show upload CTA */}
        {!underlay ? (
          <div className="space-y-3">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#243046] hover:border-cyan-500 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors hover:bg-cyan-950/20"
            >
              <Upload className="w-8 h-8 text-cyan-400 animate-bounce" />
              <div className="font-bold text-slate-200">Upload Satellite / Map Image</div>
              <div className="text-[11px] text-slate-500 font-mono">PNG, JPG, WebP supported</div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Trace real-world Grand Prix circuits directly from Google Maps or satellite imagery with exact metric scale calibration.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Controls: Visibility & Lock */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateUnderlay({ visible: !underlay.visible }, underlay.visible ? 'Hide underlay' : 'Show underlay')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition-colors ${
                  underlay.visible
                    ? 'bg-cyan-950/70 border-cyan-600 text-cyan-300'
                    : 'bg-[#18202F] border-[#243046] text-slate-400'
                }`}
              >
                {underlay.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{underlay.visible ? 'Visible' : 'Hidden'}</span>
              </button>

              <button
                onClick={() => updateUnderlay({ locked: !underlay.locked }, underlay.locked ? 'Unlock underlay' : 'Lock underlay')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition-colors ${
                  underlay.locked
                    ? 'bg-amber-950/70 border-amber-600 text-amber-300'
                    : 'bg-[#18202F] border-[#243046] text-slate-300'
                }`}
              >
                {underlay.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{underlay.locked ? 'Locked' : 'Unlocked'}</span>
              </button>
            </div>

            {/* Opacity Slider */}
            <div className="bg-[#141A28] p-3 rounded-xl border border-[#1E2638] space-y-2">
              <div className="flex justify-between items-center font-mono">
                <span className="text-slate-300 font-sans font-semibold">OPACITY</span>
                <span className="font-bold text-cyan-400">{Math.round(underlay.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={underlay.opacity}
                onChange={(e) => updateUnderlay({ opacity: parseFloat(e.target.value) }, 'Adjust underlay opacity')}
                className="w-full h-1.5 bg-[#1E2638] rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
              />
            </div>

            {/* Scale Slider */}
            <div className="bg-[#141A28] p-3 rounded-xl border border-[#1E2638] space-y-2">
              <div className="flex justify-between items-center font-mono">
                <span className="flex items-center gap-1.5 text-slate-300 font-sans font-semibold">
                  <ZoomIn className="w-3.5 h-3.5 text-emerald-400" /> SCALE
                </span>
                <span className="font-bold text-emerald-400">{underlay.scale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="8.0"
                step="0.05"
                value={underlay.scale}
                onChange={(e) => updateUnderlay({ scale: parseFloat(e.target.value) }, 'Scale underlay')}
                className="w-full h-1.5 bg-[#1E2638] rounded-lg appearance-none cursor-pointer accent-[#10B981]"
              />
            </div>

            {/* Rotation Slider */}
            <div className="bg-[#141A28] p-3 rounded-xl border border-[#1E2638] space-y-2">
              <div className="flex justify-between items-center font-mono">
                <span className="flex items-center gap-1.5 text-slate-300 font-sans font-semibold">
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" /> ROTATION
                </span>
                <span className="font-bold text-amber-400">{underlay.rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={underlay.rotation}
                onChange={(e) => updateUnderlay({ rotation: parseInt(e.target.value) }, 'Rotate underlay')}
                className="w-full h-1.5 bg-[#1E2638] rounded-lg appearance-none cursor-pointer accent-[#F59E0B]"
              />
            </div>

            {/* Position Offsets */}
            <div className="bg-[#141A28] p-3 rounded-xl border border-[#1E2638] space-y-2">
              <div className="flex justify-between items-center font-mono">
                <span className="flex items-center gap-1.5 text-slate-300 font-sans font-semibold">
                  <Move className="w-3.5 h-3.5 text-purple-400" /> POSITION OFFSET
                </span>
                <span className="font-bold text-purple-400 font-mono text-[10px]">
                  X: {Math.round(underlay.x)}m, Y: {Math.round(underlay.y)}m
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 font-mono text-[11px]">
                <button
                  onClick={() => updateUnderlay({ x: underlay.x - 20 }, 'Nudge underlay left')}
                  className="py-1 bg-[#18202F] hover:bg-slate-800 rounded border border-[#243046]"
                >
                  ← 20m
                </button>
                <button
                  onClick={() => updateUnderlay({ x: underlay.x + 20 }, 'Nudge underlay right')}
                  className="py-1 bg-[#18202F] hover:bg-slate-800 rounded border border-[#243046]"
                >
                  → 20m
                </button>
                <button
                  onClick={() => updateUnderlay({ y: underlay.y - 20 }, 'Nudge underlay up')}
                  className="py-1 bg-[#18202F] hover:bg-slate-800 rounded border border-[#243046]"
                >
                  ↑ 20m
                </button>
                <button
                  onClick={() => updateUnderlay({ y: underlay.y + 20 }, 'Nudge underlay down')}
                  className="py-1 bg-[#18202F] hover:bg-slate-800 rounded border border-[#243046]"
                >
                  ↓ 20m
                </button>
              </div>
            </div>

            {/* 2-Point Metric Calibration */}
            <div className="bg-[#141A28] p-3 rounded-xl border border-cyan-900/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
                  <Ruler className="w-3.5 h-3.5" /> 2-POINT SCALE CALIBRATION
                </span>
              </div>

              {!isCalibrating ? (
                <button
                  onClick={() => {
                    setIsCalibrating(true);
                    onResetCalibration();
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 font-bold border border-cyan-700/80 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>START 2-POINT CALIBRATION</span>
                </button>
              ) : (
                <div className="space-y-2 bg-[#0E131E] p-2.5 rounded-lg border border-cyan-800">
                  <div className="text-[11px] text-cyan-300 leading-tight">
                    {!hasPoint1 && '1. Click first reference point on underlay (e.g. start of straight)...'}
                    {hasPoint1 && !hasPoint2 && '2. Click second reference point (e.g. end of straight)...'}
                    {hasPoint1 && hasPoint2 && '3. Points set! Enter known real-world distance:'}
                  </div>

                  {hasPoint1 && hasPoint2 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={knownMetersInput}
                          onChange={(e) => setKnownMetersInput(e.target.value)}
                          placeholder="e.g. 500"
                          className="w-full bg-[#18202F] border border-[#243046] focus:border-cyan-500 rounded px-2.5 py-1 text-slate-200 font-mono text-xs"
                        />
                        <span className="font-mono text-slate-400">meters</span>
                      </div>

                      <button
                        onClick={() => {
                          const dist = parseFloat(knownMetersInput);
                          if (!isNaN(dist) && dist > 0) {
                            onApplyCalibrationDistance(dist);
                            setIsCalibrating(false);
                          }
                        }}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded flex items-center justify-center gap-1 text-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>APPLY EXACT SCALE</span>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setIsCalibrating(false);
                      onResetCalibration();
                    }}
                    className="w-full py-1 text-[10px] text-slate-400 hover:text-slate-200 font-mono underline"
                  >
                    Cancel Calibration
                  </button>
                </div>
              )}
            </div>

            {/* Clear Underlay */}
            <button
              onClick={handleClearUnderlay}
              className="w-full py-2 px-3 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 font-bold border border-red-900/60 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>REMOVE UNDERLAY</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
