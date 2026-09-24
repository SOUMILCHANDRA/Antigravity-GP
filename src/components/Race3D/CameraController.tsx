import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CarState } from '../../types/track';

interface CameraControllerProps {
  carState: CarState;
}

export const CameraController: React.FC<CameraControllerProps> = ({ carState }) => {
  const { camera } = useThree();
  const currentPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 5, -20));
  const currentLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    const rawDt = isNaN(delta) ? 0.016 : delta;
    const dt = Math.max(0.001, Math.min(rawDt, 0.05));

    const px = isNaN(carState.position.x) ? 0 : carState.position.x;
    const py = isNaN(carState.position.y) ? 0.1 : carState.position.y;
    const pz = isNaN(carState.position.z) ? 0 : carState.position.z;

    const carPos = new THREE.Vector3(px, py + 0.4, pz);

    const yaw = isNaN(carState.rotation.y) ? 0 : carState.rotation.y;
    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);

    const distance = 8.5;
    const height = 3.5;
    const lookAhead = 6.0;

    const targetCamPos = new THREE.Vector3(
      carPos.x - forwardX * distance,
      carPos.y + height,
      carPos.z - forwardZ * distance
    );

    const targetLookAt = new THREE.Vector3(
      carPos.x + forwardX * lookAhead,
      carPos.y + 0.6,
      carPos.z + forwardZ * lookAhead
    );

    // Guard against NaN
    if (!isNaN(targetCamPos.x) && !isNaN(targetCamPos.y) && !isNaN(targetCamPos.z)) {
      currentPos.current.lerp(targetCamPos, dt * 9.0);
      camera.position.copy(currentPos.current);
    }

    if (!isNaN(targetLookAt.x) && !isNaN(targetLookAt.y) && !isNaN(targetLookAt.z)) {
      currentLookAt.current.lerp(targetLookAt, dt * 9.0);
      camera.lookAt(currentLookAt.current);
    }
  });

  return null;
};
