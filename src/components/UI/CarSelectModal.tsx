import React, { useState } from 'react';
import { X, Trophy, Gauge, Zap, Wind, ShieldAlert, Cpu, Check, ArrowRight } from 'lucide-react';
import { CAR_PRESETS, CarSpecs } from '../../utils/carPresets';

interface CarSelectModalProps {
  playerCarId: string;
  aiCarId: string;
  onSelectPlayerCar: (carId: string) => void;
  onSelectAiCar: (carId: string) => void;
  onClose: () => void;
}

export const CarSelectModal: React.FC<CarSelectModalProps> = ({
  playerCarId,
  aiCarId,
  onSelectPlayerCar,
  onSelectAiCar,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'player' | 'ai'>('player');
  const [previewCarId, setPreviewCarId] = useState<string>(playerCarId);

  const carList = Object.values(CAR_PRESETS);
  const currentPreviewCar: CarSpecs = CAR_PRESETS[previewCarId] || carList[0];

  const isPlayerSelected = playerCarId === previewCarId;
  const isAiSelected = aiCarId === previewCarId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-[#0E131F] border border-[#1E2638] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E2638] flex items-center justify-between bg-[#121724]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E10600] flex items-center justify-center font-black text-white italic text-lg shadow-md shadow-red-900/30">
              AG
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-wider text-slate-100 uppercase flex items-center gap-2">
                PADDOCK GARAGE <span className="text-xs px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-mono">5 ICONS</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">Select your machine and choose your AI competitor</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Target Select Tab */}
            <div className="flex items-center p-1 bg-[#090D16] rounded-xl border border-[#1E2638]">
              <button
                onClick={() => {
                  setActiveTab('player');
                  setPreviewCarId(playerCarId);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'player'
                    ? 'bg-[#E10600] text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                YOUR CAR
              </button>
              <button
                onClick={() => {
                  setActiveTab('ai');
                  setPreviewCarId(aiCarId);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'ai'
                    ? 'bg-[#00E5FF] text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                AI RIVAL
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#171D2D] hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Car Cards List (5 columns on desktop) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="text-[11px] font-mono tracking-wider text-slate-400 uppercase mb-1">
              Select Vehicle Preset
            </div>

            {carList.map((car) => {
              const isSelected = activeTab === 'player' ? playerCarId === car.id : aiCarId === car.id;
              const isPreviewed = previewCarId === car.id;

              return (
                <div
                  key={car.id}
                  onClick={() => setPreviewCarId(car.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isPreviewed
                      ? 'bg-[#182133] border-[#384A6E] shadow-lg ring-1 ring-slate-500/30'
                      : 'bg-[#121724] border-[#1E2638] hover:bg-[#151C2C]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3.5 h-10 rounded-full"
                      style={{ backgroundColor: car.liveryColor }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">{car.year}</span>
                        <span className="text-sm font-extrabold text-slate-100">{car.shortName}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">{car.engine}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                      {car.badge}
                    </span>

                    {isSelected && (
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center ${activeTab === 'player' ? 'bg-red-600 text-white' : 'bg-cyan-400 text-slate-950'}`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Detailed Car Specs & Handling Profile */}
          <div className="lg:col-span-7 bg-[#121724] border border-[#1E2638] rounded-xl p-5 flex flex-col justify-between">
            <div>
              {/* Header Info */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#1E2638]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800 font-bold">
                      {currentPreviewCar.era}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{currentPreviewCar.team}</span>
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-wide">
                    {currentPreviewCar.name}
                  </h3>
                </div>

                <div className="text-right font-mono">
                  <div className="text-2xl font-black text-emerald-400">{currentPreviewCar.topSpeedKmh} <span className="text-xs text-slate-400 font-normal">KM/H</span></div>
                  <div className="text-[11px] text-slate-400">0-100 in {currentPreviewCar.acceleration0to100}s</div>
                </div>
              </div>

              {/* Research & Handling Profile Description */}
              <div className="my-4 p-3.5 rounded-lg bg-[#0D121D] border border-[#1E2638] text-xs text-slate-300 leading-relaxed font-sans">
                <p className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5 text-[13px]">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" /> Authentic Handling Profile:
                </p>
                {currentPreviewCar.description}
              </div>

              {/* Performance Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-[#0A0E17] border border-[#1A2234]">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> POWER OUTPUT
                  </div>
                  <div className="text-base font-extrabold text-slate-100 font-mono">{currentPreviewCar.powerHp} <span className="text-xs text-slate-400 font-normal">HP</span></div>
                  <div className="text-[10px] text-slate-500 font-mono">{currentPreviewCar.engine}</div>
                </div>

                <div className="p-3 rounded-lg bg-[#0A0E17] border border-[#1A2234]">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mb-1">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" /> VEHICLE MASS
                  </div>
                  <div className="text-base font-extrabold text-slate-100 font-mono">{currentPreviewCar.weightKg} <span className="text-xs text-slate-400 font-normal">KG</span></div>
                  <div className="text-[10px] text-slate-500 font-mono">{currentPreviewCar.weightKg > 800 ? 'GT Supercar Inertia' : 'Ultra-Light Monocoque'}</div>
                </div>

                <div className="p-3 rounded-lg bg-[#0A0E17] border border-[#1A2234]">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mb-1">
                    <Wind className="w-3.5 h-3.5 text-blue-400" /> DOWNFORCE / GRIP
                  </div>
                  <div className="text-base font-extrabold text-slate-100 font-mono">
                    {Math.round(currentPreviewCar.physics.gripMultiplier * 100)}%
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {currentPreviewCar.physics.gripMultiplier > 1.0 ? 'High Aero Wings' : (currentPreviewCar.physics.gripMultiplier < 0.9 ? '0 Aero Mechanical' : 'Balanced GT/Wedge')}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0A0E17] border border-[#1A2234]">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mb-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> BRAKING FORCE
                  </div>
                  <div className="text-base font-extrabold text-slate-100 font-mono">
                    {currentPreviewCar.physics.brakeDecel} <span className="text-xs text-slate-400 font-normal">m/s²</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {currentPreviewCar.physics.brakeDecel >= 50 ? 'Carbon-Ceramic' : (currentPreviewCar.physics.brakeDecel <= 38 ? 'Classic Steel Discs' : 'Inboard Ventilated')}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0A0E17] border border-[#1A2234]">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mb-1">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" /> TURN RESPONSE
                  </div>
                  <div className="text-base font-extrabold text-slate-100 font-mono">
                    {Math.round(currentPreviewCar.physics.turnRateScale * 100)}%
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {currentPreviewCar.physics.turnRateScale >= 1.1 ? 'Ultra-Agile' : (currentPreviewCar.physics.turnRateScale < 0.95 ? 'Mass Inertia Transition' : 'Neutral F1 Turn-In')}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0A0E17] border border-[#1A2234]">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mb-1">
                    <Trophy className="w-3.5 h-3.5 text-emerald-400" /> 3D MODEL SCALE
                  </div>
                  <div className="text-base font-extrabold text-emerald-400 font-mono">1:1 REAL</div>
                  <div className="text-[10px] text-slate-500 font-mono">True Physical Dimensions</div>
                </div>
              </div>
            </div>

            {/* Selection Buttons */}
            <div className="pt-4 border-t border-[#1E2638] flex items-center justify-between gap-4">
              <div className="text-xs font-mono text-slate-400">
                Current: <span className="text-slate-200 font-bold">{activeTab === 'player' ? CAR_PRESETS[playerCarId]?.shortName : CAR_PRESETS[aiCarId]?.shortName}</span>
              </div>

              <div className="flex items-center gap-3">
                {activeTab === 'player' ? (
                  <button
                    onClick={() => {
                      onSelectPlayerCar(previewCarId);
                    }}
                    className={`px-5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2 ${
                      isPlayerSelected
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                        : 'bg-[#E10600] hover:bg-red-700 text-white shadow-lg shadow-red-900/40 cursor-pointer'
                    }`}
                  >
                    {isPlayerSelected ? (
                      <>
                        <Check className="w-4 h-4" /> SELECTED AS PLAYER
                      </>
                    ) : (
                      <>
                        DRIVE THIS CAR <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onSelectAiCar(previewCarId);
                    }}
                    className={`px-5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2 ${
                      isAiSelected
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                        : 'bg-[#00E5FF] hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/30 cursor-pointer'
                    }`}
                  >
                    {isAiSelected ? (
                      <>
                        <Check className="w-4 h-4" /> SELECTED AS AI RIVAL
                      </>
                    ) : (
                      <>
                        ASSIGN AS AI RIVAL <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
