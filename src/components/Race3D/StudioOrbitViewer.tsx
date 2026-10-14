import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SplinePoint, TrackConfig } from '../../types/track';
import { TrackMesh } from './TrackMesh';
import { Environment } from './Environment';

interface StudioOrbitViewerProps {
  splinePoints: SplinePoint[];
  trackConfig: TrackConfig;
}

export const StudioOrbitViewer: React.FC<StudioOrbitViewerProps> = ({
  splinePoints,
  trackConfig
}) => {
  // Calculate bounding box and center of the circuit
  const { center, initialCamPos } = useMemo(() => {
    if (splinePoints.length === 0) {
      return {
        center: new THREE.Vector3(0, 0, 0),
        initialCamPos: [0, 80, 160] as [number, number, number]
      };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    let avgY = 0;

    for (const pt of splinePoints) {
      if (pt.position.x < minX) minX = pt.position.x;
      if (pt.position.x > maxX) maxX = pt.position.x;
      if (pt.position.z < minZ) minZ = pt.position.z;
      if (pt.position.z > maxZ) maxZ = pt.position.z;
      avgY += pt.position.y;
    }
    avgY /= splinePoints.length;

    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const span = Math.max(maxX - minX, maxZ - minZ, 100);

    return {
      center: new THREE.Vector3(cx, avgY, cz),
      initialCamPos: [cx, avgY + span * 0.7, cz + span * 0.9] as [number, number, number]
    };
  }, [splinePoints]);

  return (
    <div className="w-full h-full bg-[#0B0E14] relative overflow-hidden select-none">
      <Canvas
        shadows
        camera={{ position: initialCamPos, fov: 55, near: 0.1, far: 4000 }}
        gl={{ antialias: true, alpha: false }}
        className="w-full h-full block"
      >
        <OrbitControls
          target={center}
          enableDamping
          dampingFactor={0.08}
          minDistance={10}
          maxDistance={2500}
          maxPolarAngle={Math.PI / 2 - 0.02} // Keep camera above ground
        />
        <Environment />
        <TrackMesh splinePoints={splinePoints} trackConfig={trackConfig} />
      </Canvas>

      {/* 3D Navigation Overlay Help Pill */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl px-3 py-1.5 text-[11px] font-mono text-slate-300 shadow-xl flex items-center gap-3">
        <span className="text-cyan-400 font-bold">3D Studio Orbit</span>
        <span className="text-slate-500">|</span>
        <span>Left Drag: <strong className="text-white">Rotate</strong></span>
        <span>Right Drag: <strong className="text-white">Pan</strong></span>
        <span>Scroll: <strong className="text-white">Zoom</strong></span>
      </div>
    </div>
  );
};
