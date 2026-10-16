import React from 'react';
import { Canvas } from '@react-three/fiber';
import { SplinePoint, TrackConfig } from '../../types/track';
import { TrackMesh } from './TrackMesh';
import { Environment } from './Environment';
import { FlythroughCamera, FlythroughCameraMode } from './FlythroughCamera';

interface FlythroughViewerProps {
  splinePoints: SplinePoint[];
  trackConfig: TrackConfig;
  isPlaying: boolean;
  progress: number;
  onProgressChange: (newProgress: number) => void;
  speedMultiplier: number;
  cameraMode: FlythroughCameraMode;
}

export const FlythroughViewer: React.FC<FlythroughViewerProps> = ({
  splinePoints,
  trackConfig,
  isPlaying,
  progress,
  onProgressChange,
  speedMultiplier,
  cameraMode
}) => {
  return (
    <div className="w-full h-full bg-[#0B0E14] relative">
      <Canvas
        shadows
        camera={{ position: [0, 20, 40], fov: 60, near: 0.1, far: 2500 }}
        gl={{ antialias: true, alpha: false }}
        className="w-full h-full block"
      >
        <FlythroughCamera
          splinePoints={splinePoints}
          isPlaying={isPlaying}
          progress={progress}
          onProgressChange={onProgressChange}
          speedMultiplier={speedMultiplier}
          cameraMode={cameraMode}
        />
        <Environment splinePoints={splinePoints} />
        <TrackMesh splinePoints={splinePoints} trackConfig={trackConfig} />
      </Canvas>
    </div>
  );
};
