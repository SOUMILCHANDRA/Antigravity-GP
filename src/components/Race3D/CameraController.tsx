import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CarState } from '../../types/track';

interface CameraControllerProps {
  carState: CarState;
}

export const CameraController: React.FC<CameraControllerProps> = ({ carState }) => {
  const { camera } = useThree();
  const currentPos = useRef<THREE.Vector3 | null>(null);
  const currentLookAt = useRef<THREE.Vector3 | null>(null);

  useFrame((_, delta) => {
    const rawDt = isNaN(delta) ? 0.016 : delta;
    const dt = Math.max(0.001, Math.min(rawDt, 0.05));

    const px = isNaN(carState.position.x) ? 0 : carState.position.x;
    const py = isNaN(carState.position.y) ? 0.1 : carState.position.y;
    const pz = isNaN(carState.position.z) ? 0 : carState.position.z;

    const carPos = new THREE.Vector3(px, py + 0.4, pz);

    // Phase 5 & 11: Single authoritative forward vector convention
    const yaw = isNaN(carState.rotation.y) ? 0 : carState.rotation.y;
    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);

    const distance = 8.0;
    const height = 3.2;
    const lookAhead = 5.0;

    const targetCamPos = new THREE.Vector3(
      carPos.x - forwardX * distance,
      carPos.y + height,
      carPos.z - forwardZ * distance
    );

    const targetLookAt = new THREE.Vector3(
      carPos.x + forwardX * lookAhead,
      carPos.y + 0.5,
      carPos.z + forwardZ * lookAhead
    );

    // Guard against NaN
    if (isNaN(targetCamPos.x) || isNaN(targetCamPos.y) || isNaN(targetCamPos.z)) return;
    if (isNaN(targetLookAt.x) || isNaN(targetLookAt.y) || isNaN(targetLookAt.z)) return;

    // Phase 9: Snap immediately on initial spawn, mode change, or teleports (no lerping from world origin)
    const isFirstFrame = !currentPos.current || !currentLookAt.current;
    const isTeleport = currentPos.current && currentPos.current.distanceTo(targetCamPos) > 25.0;

    if (isFirstFrame || isTeleport || !currentPos.current || !currentLookAt.current) {
      currentPos.current = targetCamPos.clone();
      currentLookAt.current = targetLookAt.clone();
      camera.position.copy(targetCamPos);
      camera.lookAt(targetLookAt);
      return;
    }

    // Subsequent gameplay frames: smooth tracking
    const pos = currentPos.current;
    const look = currentLookAt.current;
    pos.lerp(targetCamPos, dt * 9.0);
    look.lerp(targetLookAt, dt * 9.0);
    camera.position.copy(pos);
    camera.lookAt(look);
  });

  return null;
};
