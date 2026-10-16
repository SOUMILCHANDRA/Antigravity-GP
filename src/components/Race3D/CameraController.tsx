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

    const carPos = new THREE.Vector3(px, py + 0.35, pz);

    const yaw = isNaN(carState.rotation.y) ? 0 : carState.rotation.y;
    const pitch = isNaN(carState.rotation.x) ? 0 : carState.rotation.x;
    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);

    // Professional dynamic chase camera framing
    const distance = 8.4;
    const height = 2.35;
    const lookAhead = 18.0;

    // Follow vehicle pitch so camera tilts up hills (e.g. Eau Rouge / Raidillon)
    const pitchSin = Math.sin(pitch);
    const targetCamPos = new THREE.Vector3(
      carPos.x - forwardX * distance,
      carPos.y + height - pitchSin * 1.8,
      carPos.z - forwardZ * distance
    );

    const targetLookAt = new THREE.Vector3(
      carPos.x + forwardX * lookAhead,
      carPos.y + 0.45 + pitchSin * 8.5,
      carPos.z + forwardZ * lookAhead
    );

    // Guard against NaN
    if (isNaN(targetCamPos.x) || isNaN(targetCamPos.y) || isNaN(targetCamPos.z)) return;
    if (isNaN(targetLookAt.x) || isNaN(targetLookAt.y) || isNaN(targetLookAt.z)) return;

    // Dynamic Speed FOV (58° at standstill, expanding up to 72° at 320+ km/h)
    const perspectiveCam = camera as THREE.PerspectiveCamera;
    if (perspectiveCam && perspectiveCam.isPerspectiveCamera) {
      const speedKmh = isNaN(carState.speedKmh) ? 0 : Math.max(0, carState.speedKmh);
      const targetFov = 58.0 + Math.min(14.0, (speedKmh / 320.0) * 14.0);
      perspectiveCam.fov += (targetFov - perspectiveCam.fov) * Math.min(1.0, dt * 5.0);
      perspectiveCam.updateProjectionMatrix();
    }

    // Snap immediately on initial spawn, mode change, or teleports
    const isFirstFrame = !currentPos.current || !currentLookAt.current;
    const isTeleport = currentPos.current && currentPos.current.distanceTo(targetCamPos) > 30.0;

    if (isFirstFrame || isTeleport || !currentPos.current || !currentLookAt.current) {
      currentPos.current = targetCamPos.clone();
      currentLookAt.current = targetLookAt.clone();
      camera.position.copy(targetCamPos);
      camera.lookAt(targetLookAt);
      return;
    }

    // Smooth gameplay camera tracking with responsive pitch and yaw follow
    const pos = currentPos.current;
    const look = currentLookAt.current;
    pos.lerp(targetCamPos, dt * 10.0);
    look.lerp(targetLookAt, dt * 10.0);
    camera.position.copy(pos);
    camera.lookAt(look);
  });

  return null;
};
