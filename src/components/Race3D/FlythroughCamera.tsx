import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SplinePoint } from '../../types/track';

export type FlythroughCameraMode = 'drone' | 'helicopter' | 'broadcast';

interface FlythroughCameraProps {
  splinePoints: SplinePoint[];
  isPlaying: boolean;
  progress: number; // 0 to 1
  onProgressChange: (newProgress: number) => void;
  speedMultiplier?: number;
  cameraMode?: FlythroughCameraMode;
}

export const FlythroughCamera: React.FC<FlythroughCameraProps> = ({
  splinePoints,
  isPlaying,
  progress,
  onProgressChange,
  speedMultiplier = 1.0,
  cameraMode = 'drone'
}) => {
  const { camera } = useThree();
  const currentPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const currentLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useFrame((_, delta) => {
    if (splinePoints.length < 2) return;

    const dt = Math.max(0.001, Math.min(delta, 0.05));

    // Advance progress if playing
    if (isPlaying) {
      // Speed: roughly 1 lap in 50 seconds at 1x
      const lapRate = 0.02 * speedMultiplier;
      const nextProg = (progressRef.current + lapRate * dt) % 1.0;
      progressRef.current = nextProg;
      onProgressChange(nextProg);
    }

    const n = splinePoints.length;
    const continuousIdx = progressRef.current * n;
    const baseIdx = Math.floor(continuousIdx) % n;
    const nextIdx = (baseIdx + 1) % n;
    const alpha = continuousIdx - Math.floor(continuousIdx);

    const ptA = splinePoints[baseIdx];
    const ptB = splinePoints[nextIdx];

    // Interpolate position along spline
    const posX = ptA.position.x + (ptB.position.x - ptA.position.x) * alpha;
    const posY = ptA.position.y + (ptB.position.y - ptA.position.y) * alpha;
    const posZ = ptA.position.z + (ptB.position.z - ptA.position.z) * alpha;

    const tanX = ptA.tangent.x + (ptB.tangent.x - ptA.tangent.x) * alpha;
    const tanY = ptA.tangent.y + (ptB.tangent.y - ptA.tangent.y) * alpha;
    const tanZ = ptA.tangent.z + (ptB.tangent.z - ptA.tangent.z) * alpha;
    const tangent = new THREE.Vector3(tanX, tanY, tanZ).normalize();

    const targetPos = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3();

    if (cameraMode === 'helicopter') {
      // High-angle wide cinematic aerial follow
      targetPos.set(posX - tangent.x * 20, posY + 40, posZ - tangent.z * 20);
      targetLookAt.set(posX + tangent.x * 15, posY, posZ + tangent.z * 15);
    } else if (cameraMode === 'broadcast') {
      // Simulated Trackside TV camera: fixed towers at every 10th of track
      const towerIdx = Math.floor(progressRef.current * 8);
      const towerPt = splinePoints[Math.floor((towerIdx / 8) * n)];
      const towerNorm = new THREE.Vector3(towerPt.normal.x, 0, towerPt.normal.z).normalize();

      targetPos.set(
        towerPt.position.x + towerNorm.x * 18,
        towerPt.position.y + 7.5,
        towerPt.position.z + towerNorm.z * 18
      );
      targetLookAt.set(posX, posY + 1.2, posZ);
    } else {
      // Default: Drone Chase (dynamic low banking follow)
      const droneDist = 12.0;
      const droneHeight = 4.5;
      const lookAhead = 15.0;

      targetPos.set(
        posX - tangent.x * droneDist,
        posY + droneHeight,
        posZ - tangent.z * droneDist
      );
      targetLookAt.set(
        posX + tangent.x * lookAhead,
        posY + 1.2,
        posZ + tangent.z * lookAhead
      );
    }

    // Smooth camera motion
    const lerpSpeed = cameraMode === 'broadcast' ? 12.0 : 6.0;
    currentPosRef.current.lerp(targetPos, dt * lerpSpeed);
    currentLookAtRef.current.lerp(targetLookAt, dt * lerpSpeed);

    camera.position.copy(currentPosRef.current);
    camera.lookAt(currentLookAtRef.current);
  });

  return null;
};
