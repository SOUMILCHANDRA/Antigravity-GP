import React from 'react';
import { Canvas } from '@react-three/fiber';
import { AICompetitorState, CarState, SplinePoint, TrackConfig } from '../../types/track';
import { TrackMesh } from './TrackMesh';
import { F1Car } from './F1Car';
import { Environment } from './Environment';
import { CameraController } from './CameraController';
import { IdealRacingLine } from './IdealRacingLine';

interface RaceCanvasProps {
  splinePoints: SplinePoint[];
  trackConfig: TrackConfig;
  carState: CarState;
  aiCarState?: AICompetitorState | null;
  showRacingLine?: boolean;
}

export const RaceCanvas: React.FC<RaceCanvasProps> = ({
  splinePoints,
  trackConfig,
  carState,
  aiCarState,
  showRacingLine = true
}) => {
  return (
    <div className="w-full h-full bg-[#0B0E14] relative">
      <Canvas
        shadows
        camera={{ position: [0, 5, -20], fov: 60, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
        className="w-full h-full block"
      >
        <CameraController carState={carState} />
        <Environment />
        <TrackMesh splinePoints={splinePoints} trackConfig={trackConfig} />
        <IdealRacingLine splinePoints={splinePoints} visible={showRacingLine} />
        <F1Car carState={carState} />
        {aiCarState && (
          <F1Car
            carState={aiCarState}
            isAI={true}
            liveryColor={aiCarState.color || '#00E5FF'}
          />
        )}
      </Canvas>
    </div>
  );
};
