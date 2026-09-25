import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AppMode, CarState, LapTelemetry, TrackConfig, TrackNode, AICompetitorState, RaceBattleState, AIDifficulty } from './types/track';
import { EMPTY_TRACK } from './utils/presets';
import { buildTrackCurve, sampleSplinePoints, getTrackSpawnTransform, getNearestSplinePoint, checkFinishLineCrossing } from './utils/spline';
import { createInitialCarState, updateCarPhysics, resetVehicle } from './utils/physics';
import { createAICompetitor, updateAICompetitor, resolveCarCollision, calculateRaceBattle } from './utils/aiCompetitor';
import { generateIdealRacingLine } from './utils/racingLine';
import { audioEngine } from './utils/audio';
import { TrackHistory } from './utils/history';

import { Header } from './components/Header';
import { EditorCanvas } from './components/TrackEditor/EditorCanvas';
import { EditorToolbar } from './components/TrackEditor/EditorToolbar';

import { RaceCanvas } from './components/Race3D/RaceCanvas';
import { RaceHUD } from './components/UI/RaceHUD';
import { formatTime } from './utils/time';
import { Minimap } from './components/UI/Minimap';
import { LapResultModal } from './components/UI/LapResultModal';

export function App() {
  const [mode, setMode] = useState<AppMode>('builder');
  const [track, setTrack] = useState<TrackConfig>(EMPTY_TRACK);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showRacingLine, setShowRacingLine] = useState<boolean>(true);

  // History stack for Undo/Redo
  const historyRef = useRef<TrackHistory>(new TrackHistory(EMPTY_TRACK));
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Audio Mute state (Muted by default)
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // 3D Car & Lap states
  const [carState, setCarState] = useState<CarState>(createInitialCarState());
  const carStateRef = useRef<CarState>(createInitialCarState());
  const prevCarPosRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const prevSplineIndexRef = useRef<number>(0);
  const hasPassedSector2Ref = useRef<boolean>(false);
  const [showLapModal, setShowLapModal] = useState<boolean>(false);
  const [lapToast, setLapToast] = useState<{ message: string; isBest: boolean } | null>(null);
  const INITIAL_LAP_TELEMETRY: LapTelemetry = {
    currentLapTime: 0,
    lastLapTime: null,
    bestLapTime: null,
    completedLaps: 0,
    maxSpeedKmh: 0,
    lapValid: true
  };

  const [lapTelemetry, setLapTelemetry] = useState<LapTelemetry>(INITIAL_LAP_TELEMETRY);
  const lapTelemetryRef = useRef<LapTelemetry>(INITIAL_LAP_TELEMETRY);

  useEffect(() => {
    lapTelemetryRef.current = lapTelemetry;
  }, [lapTelemetry]);

  // AI Competitor & Duel Battle State
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('challenger');
  const [aiCarState, setAiCarState] = useState<AICompetitorState>(createAICompetitor([]));
  const aiCarStateRef = useRef<AICompetitorState>(createAICompetitor([]));
  const aiPassedSector2Ref = useRef<boolean>(false);
  const raceBattleStateRef = useRef<RaceBattleState>({
    playerRank: 1,
    aiRank: 2,
    gapSeconds: 0,
    gapMeters: 0
  });
  const [raceBattleState, setRaceBattleState] = useState<RaceBattleState>({
    playerRank: 1,
    aiRank: 2,
    gapSeconds: 0,
    gapMeters: 0
  });

  const cycleAIDifficulty = useCallback(() => {
    setAiDifficulty(prev => {
      const next: AIDifficulty = prev === 'challenger' ? 'legend' : (prev === 'legend' ? 'rookie' : 'challenger');
      return next;
    });
  }, []);

  // Authoritative Keyboard Input Map (Default ALL to false)
  const keysRef = useRef<{ [key: string]: boolean }>({});

  const clearAllInputs = useCallback(() => {
    keysRef.current = {};
  }, []);

  const updateTrackState = (updater: TrackConfig | ((prev: TrackConfig) => TrackConfig)) => {
    setTrack(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      historyRef.current.pushState(next);
      setCanUndo(historyRef.current.canUndo());
      setCanRedo(historyRef.current.canRedo());
      return next;
    });
  };

  const handleUndo = () => {
    const prev = historyRef.current.undo();
    if (prev) {
      setTrack(prev);
      setSelectedNodeId(null);
      setCanUndo(historyRef.current.canUndo());
      setCanRedo(historyRef.current.canRedo());
    }
  };

  const handleRedo = () => {
    const next = historyRef.current.redo();
    if (next) {
      setTrack(next);
      setSelectedNodeId(null);
      setCanUndo(historyRef.current.canUndo());
      setCanRedo(historyRef.current.canRedo());
    }
  };

  const handleClearTrack = () => {
    updateTrackState({
      ...EMPTY_TRACK,
      id: `user-circuit-${Date.now()}`
    });
    setSelectedNodeId(null);
  };

  const splinePoints = useMemo(() => {
    const curve = buildTrackCurve(track.nodes, track.isClosed);
    return sampleSplinePoints(curve, track.nodes, 350);
  }, [track]);

  const racingLinePoints = useMemo(() => {
    return generateIdealRacingLine(splinePoints);
  }, [splinePoints]);

  const circuitLength = useMemo(() => {
    if (splinePoints.length < 2) return 0;
    return splinePoints[splinePoints.length - 1].distance;
  }, [splinePoints]);

  const handleAddPoint = (worldPos: { x: number; y: number }) => {
    const newNode: TrackNode = {
      id: Date.now().toString(),
      x: Math.round(worldPos.x),
      y: Math.round(worldPos.y),
      elevation: 0,
      width: track.defaultWidth
    };

    updateTrackState(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    setSelectedNodeId(newNode.id);
  };

  // Authoritative Car & AI Spawn & Reset
  const resetCarOnTrack = useCallback((resetAllTelemetry = false) => {
    clearAllInputs();
    if (splinePoints.length < 2) return;

    // Reset Player Car
    const fresh = resetVehicle(createInitialCarState(), splinePoints);
    carStateRef.current = fresh;
    prevCarPosRef.current = { x: fresh.position.x, z: fresh.position.z };
    prevSplineIndexRef.current = 0;
    setCarState(fresh);
    hasPassedSector2Ref.current = false;
    setLapToast(null);

    // Reset AI Competitor
    const freshAI = createAICompetitor(splinePoints, aiDifficulty);
    aiCarStateRef.current = freshAI;
    aiPassedSector2Ref.current = false;
    setAiCarState(freshAI);

    const initialBattle: RaceBattleState = {
      playerRank: 1,
      aiRank: 2,
      gapSeconds: 0,
      gapMeters: 9
    };
    raceBattleStateRef.current = initialBattle;
    setRaceBattleState(initialBattle);

    if (resetAllTelemetry) {
      setLapTelemetry(INITIAL_LAP_TELEMETRY);
      lapTelemetryRef.current = INITIAL_LAP_TELEMETRY;
    } else {
      setLapTelemetry(prev => {
        const next = {
          ...prev,
          currentLapTime: 0,
          lapValid: true
        };
        lapTelemetryRef.current = next;
        return next;
      });
    }
  }, [splinePoints, clearAllInputs, aiDifficulty]);

  // Completely reset state whenever switching modes
  useEffect(() => {
    if (mode === 'race') {
      resetCarOnTrack(false);
    } else {
      clearAllInputs();
      setLapTelemetry(INITIAL_LAP_TELEMETRY);
      lapTelemetryRef.current = INITIAL_LAP_TELEMETRY;
      setLapToast(null);
    }
  }, [mode, resetCarOnTrack, clearAllInputs]);

  // When track nodes change (user designs or edits circuit), wipe all previous lap telemetry & reset AI
  useEffect(() => {
    setLapTelemetry(INITIAL_LAP_TELEMETRY);
    lapTelemetryRef.current = INITIAL_LAP_TELEMETRY;
    setLapToast(null);
    const freshAI = createAICompetitor(splinePoints, aiDifficulty);
    aiCarStateRef.current = freshAI;
    setAiCarState(freshAI);
  }, [track.nodes, splinePoints, aiDifficulty]);

  // Robust Keyboard Event Listeners with Window Blur Guard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      keysRef.current[e.code] = true;

      // R Key Reset: resets vehicle to start line and restarts current lap timer
      if (e.code === 'KeyR' && mode === 'race') {
        resetCarOnTrack(false);
      }

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const handleBlur = () => {
      clearAllInputs();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [mode, resetCarOnTrack]);

  // Authoritative Physics Game Loop
  useEffect(() => {
    if (mode !== 'race' || splinePoints.length === 0) return;

    let animFrameId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.max(0.001, Math.min(isNaN(rawDt) ? 0.016 : rawDt, 0.05));
      lastTime = now;

      const keys = keysRef.current;
      const inputs = {
        throttle: !!(keys['KeyW'] || keys['ArrowUp']),
        brake: !!(keys['KeyS'] || keys['ArrowDown'] || keys['Space']),
        left: !!(keys['KeyA'] || keys['ArrowLeft']),
        right: !!(keys['KeyD'] || keys['ArrowRight']),
        reset: !!keys['KeyR']
      };

      // 1. Step Player Physics using carStateRef to prevent React re-mount churn
      let nextState = updateCarPhysics(carStateRef.current, inputs, splinePoints, dt);

      // 2. Step AI Competitor Physics & Intelligent Racing Logic (if enabled)
      if (aiEnabled && splinePoints.length >= 4) {
        const battle = raceBattleStateRef.current;
        const progressDiff = battle.gapMeters * (battle.playerRank === 1 ? 1 : -1);

        const { nextAIState } = updateAICompetitor({
          aiState: aiCarStateRef.current,
          playerPos: nextState.position,
          playerSpeedKmh: nextState.speedKmh,
          splinePoints,
          racingLinePoints,
          deltaSeconds: dt,
          aiPassedSector2Ref,
          difficulty: aiDifficulty,
          playerProgressDiff: progressDiff
        });

        // 3. Realistic Car-to-Car Physical Collision Resolution
        const collisionResolved = resolveCarCollision(nextState, nextAIState);
        nextState = collisionResolved.playerState;
        const resolvedAI = collisionResolved.aiState;

        aiCarStateRef.current = resolvedAI;
        setAiCarState(resolvedAI);

        // 4. Update Live Race Battle Telemetry (P1/P2 & Gap)
        const newBattle = calculateRaceBattle(
          nextState.position,
          lapTelemetryRef.current,
          resolvedAI.position,
          resolvedAI.lapTelemetry,
          splinePoints,
          resolvedAI.hasStartedRace ?? false
        );
        raceBattleStateRef.current = newBattle;
        setRaceBattleState(newBattle);
      }

      const prevPos = { ...prevCarPosRef.current };
      const currPos = { x: nextState.position.x, z: nextState.position.z };
      prevCarPosRef.current = currPos;

      carStateRef.current = nextState;
      setCarState(nextState);

      const engineThrottle = nextState.throttle > 0 || (nextState.brake > 0 && nextState.speedKmh < 0);
      audioEngine.updateEngineSound(Math.abs(nextState.speedKmh), engineThrottle ? 1 : 0, true);
      audioEngine.updateTireSqueal(nextState.skidding);

      // 2. Track circuit progression
      const { nearestIndex, segmentT } = getNearestSplinePoint(nextState.position, splinePoints);
      const startP = splinePoints[0];
      const distFromStart = startP ? Math.hypot(currPos.x - startP.position.x, currPos.z - startP.position.z) : 0;

      // Mark progress when car has driven away from start or passed midpoint
      if (distFromStart > 25 || (segmentT > 0.25 && segmentT < 0.95)) {
        hasPassedSector2Ref.current = true;
      }

      if (nextState.offTrack) {
        setLapTelemetry(l => {
          if (l.lapValid) {
            const next = { ...l, lapValid: false };
            lapTelemetryRef.current = next;
            return next;
          }
          return l;
        });
      }

      // 3. Multi-layer Finish Line Crossing Detection
      let lineCrossed = false;

      if (startP) {
        // A. Plane crossing along track tangent: s changes from negative (< 0) to non-negative (>= 0)
        const vPrevX = prevPos.x - startP.position.x;
        const vPrevZ = prevPos.z - startP.position.z;
        const vCurrX = currPos.x - startP.position.x;
        const vCurrZ = currPos.z - startP.position.z;

        const sPrev = vPrevX * startP.tangent.x + vPrevZ * startP.tangent.z;
        const sCurr = vCurrX * startP.tangent.x + vCurrZ * startP.tangent.z;
        const latDist = Math.abs(vCurrX * startP.binormal.x + vCurrZ * startP.binormal.z);
        const halfWidth = (startP.width / 2) + 5.0;

        if (sPrev < 0 && sCurr >= 0 && latDist <= halfWidth && distFromStart < 25.0) {
          lineCrossed = true;
        }

        // B. Spline Index rollover (last segments > 290 to first segments < 40)
        const prevIdx = prevSplineIndexRef.current;
        if (prevIdx >= 290 && nearestIndex <= 40) {
          lineCrossed = true;
        }

        // C. Vector Segment Intersection
        if (!lineCrossed && checkFinishLineCrossing(prevPos, currPos, startP)) {
          lineCrossed = true;
        }
      }
      prevSplineIndexRef.current = nearestIndex;

      // 4. Step Lap Telemetry
      if (lineCrossed && hasPassedSector2Ref.current) {
        hasPassedSector2Ref.current = false;

        setLapTelemetry(prev => {
          if (prev.currentLapTime < 3.0) return prev; // Guard against rapid duplicate trigger

          const finalLapTime = prev.currentLapTime;
          const isValid = prev.lapValid;
          const isBest = isValid && (prev.bestLapTime === null || finalLapTime < prev.bestLapTime);
          const bestTime = isBest ? finalLapTime : prev.bestLapTime;

          // Dispatch toast notification asynchronously
          setTimeout(() => {
            setLapToast({
              message: isValid ? `LAP ${prev.completedLaps + 1}: ${formatTime(finalLapTime)}` : 'LAP INVALID (OFF TRACK)',
              isBest
            });
          }, 0);

          const next = {
            currentLapTime: 0,
            lastLapTime: finalLapTime,
            bestLapTime: bestTime,
            completedLaps: prev.completedLaps + 1,
            maxSpeedKmh: Math.max(prev.maxSpeedKmh, Math.abs(nextState.speedKmh)),
            lapValid: true
          };
          lapTelemetryRef.current = next;
          return next;
        });
      } else {
        setLapTelemetry(prev => {
          const next = {
            ...prev,
            currentLapTime: prev.currentLapTime + dt,
            maxSpeedKmh: Math.max(prev.maxSpeedKmh, Math.abs(nextState.speedKmh))
          };
          lapTelemetryRef.current = next;
          return next;
        });
      }

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId);
  }, [mode, splinePoints, racingLinePoints, aiEnabled, aiDifficulty]);

  // Auto-dismiss lap toast notification after 3.5 seconds
  useEffect(() => {
    if (!lapToast) return;
    const timer = setTimeout(() => setLapToast(null), 3500);
    return () => clearTimeout(timer);
  }, [lapToast]);

  const handleToggleMute = () => {
    audioEngine.init();
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleExportTrack = () => {
    const jsonStr = JSON.stringify(track, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom-circuit.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTrack = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported && imported.nodes && Array.isArray(imported.nodes)) {
          updateTrackState(imported);
          setSelectedNodeId(null);
        }
      } catch (err) {
        alert('Invalid circuit JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#0B0E14] select-none font-sans text-slate-100">
      <Header
        mode={mode}
        setMode={(newMode) => {
          clearAllInputs();
          setMode(newMode);
        }}
        currentTrack={track}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onExportTrack={handleExportTrack}
        onImportTrack={handleImportTrack}
        circuitLength={circuitLength}
      />

      <main className="flex-1 relative w-full h-[calc(100vh-64px)] overflow-hidden">
        {mode === 'builder' ? (
          <div className="flex w-full h-full relative">
            <EditorCanvas
              track={track}
              setTrack={updateTrackState}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
              onAddPoint={handleAddPoint}
            />
            <EditorToolbar
              track={track}
              setTrack={updateTrackState}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
              circuitLength={circuitLength}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onClearTrack={handleClearTrack}
              onDrive={() => {
                clearAllInputs();
                setMode('race');
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full relative">
            <RaceCanvas
              splinePoints={splinePoints}
              trackConfig={track}
              carState={carState}
              aiCarState={aiEnabled ? aiCarState : null}
              showRacingLine={showRacingLine}
            />

            <RaceHUD
              telemetry={lapTelemetry}
              speedKmh={carState.speedKmh}
              isOffTrack={carState.offTrack}
              showRacingLine={showRacingLine}
              onToggleRacingLine={() => setShowRacingLine(prev => !prev)}
              onReset={() => resetCarOnTrack(false)}
              lapToast={lapToast}
              battleState={aiEnabled ? raceBattleState : null}
              aiEnabled={aiEnabled}
              onToggleAI={() => setAiEnabled(prev => !prev)}
              aiTelemetry={aiCarState.lapTelemetry}
              difficulty={aiDifficulty}
              onChangeDifficulty={cycleAIDifficulty}
              isDrafting={aiCarState.isDrafting}
              isOvertaking={aiCarState.isOvertaking}
            />
            
            <Minimap
              splinePoints={splinePoints}
              carPosition={carState.position}
              carRotationY={carState.rotation.y}
              aiPosition={aiEnabled ? aiCarState.position : null}
              aiRotationY={aiEnabled ? aiCarState.rotation.y : undefined}
            />

            {showLapModal && (
              <LapResultModal
                telemetry={lapTelemetry}
                onContinueDriving={() => setShowLapModal(false)}
                onSwitchToEditor={() => {
                  setShowLapModal(false);
                  clearAllInputs();
                  setMode('builder');
                }}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
export default App;
