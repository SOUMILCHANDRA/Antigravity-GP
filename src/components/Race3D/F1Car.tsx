import React, { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CarState } from '../../types/track';

interface F1CarProps {
  carState: CarState;
  isAI?: boolean;
  liveryColor?: string;
  isDrafting?: boolean;
  isOvertaking?: boolean;
}

type MaterialGroup = 'livery' | 'carbon' | 'tire' | 'metal' | 'helmet' | 'light';
type CarGeometrySet = Record<MaterialGroup, THREE.BufferGeometry>;

function makeCarGeometry(): CarGeometrySet {
  const parts: Record<MaterialGroup, THREE.BufferGeometry[]> = {
    livery: [], carbon: [], tire: [], metal: [], helmet: [], light: []
  };
  const add = (group: MaterialGroup, geometry: THREE.BufferGeometry, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) => {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(1, 1, 1)
    );
    geometry.applyMatrix4(matrix);
    parts[group].push(geometry);
  };
  const box = (group: MaterialGroup, size: [number, number, number], position: [number, number, number], rotation?: [number, number, number]) =>
    add(group, new THREE.BoxGeometry(...size), position, rotation);
  const cylinder = (group: MaterialGroup, radiusTop: number, radiusBottom: number, height: number, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0], radialSegments = 10) =>
    add(group, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), position, rotation);

  // Floor, sculpted nose, monocoque and sidepods (local +Z faces forward).
  box('carbon', [1.72, 0.16, 3.65], [0, 0.24, -0.08]);
  box('livery', [0.72, 0.4, 1.22], [0, 0.49, -0.28]);
  cylinder('livery', 0.11, 0.39, 1.98, [0, 0.43, 0.65], [Math.PI / 2, 0, 0], 10);
  for (const side of [-1, 1]) {
    box('livery', [0.56, 0.34, 1.38], [side * 0.77, 0.43, -0.18]);
    box('carbon', [0.07, 0.42, 0.58], [side * 1.02, 0.43, 1.54]);
    box('carbon', [0.07, 0.62, 0.08], [side * 0.42, 0.78, -1.51]);
  }

  // Multi-element front wing and rear wing.
  box('carbon', [2.12, 0.11, 0.55], [0, 0.27, 1.54]);
  box('livery', [1.96, 0.07, 0.24], [0, 0.4, 1.38]);
  box('livery', [1.72, 0.13, 0.34], [0, 1.08, -1.53]);
  box('carbon', [1.66, 0.08, 0.3], [0, 0.91, -1.49]);

  // Four slicks, hubs, halo, driver helmet and rain light.
  for (const side of [-1, 1]) {
    for (const axle of [-1, 1]) {
      cylinder('tire', 0.38, 0.38, 0.34, [side * 0.99, 0.37, axle * 0.98], [0, 0, Math.PI / 2], 18);
      cylinder('metal', 0.22, 0.22, 0.04, [side * 1.18, 0.37, axle * 0.98], [0, 0, Math.PI / 2], 12);
    }
  }
  box('metal', [0.055, 0.38, 0.055], [0, 0.84, -0.38]);
  box('metal', [0.68, 0.045, 0.05], [0, 1.02, -0.38]);
  cylinder('helmet', 0.22, 0.22, 0.22, [0, 0.73, -0.48], [0, 0, 0], 12);
  box('light', [0.32, 0.08, 0.035], [0, 0.29, -1.94]);

  const geometries = {} as CarGeometrySet;
  for (const group of Object.keys(parts) as MaterialGroup[]) {
    const merged = mergeGeometries(parts[group], false);
    if (!merged) throw new Error(`Unable to build F1 car geometry: ${group}`);
    merged.computeBoundingSphere();
    geometries[group] = merged;
  }
  return geometries;
}

const CAR_GEOMETRIES = makeCarGeometry();
const SHADOW_GEOMETRY = new THREE.PlaneGeometry(2.8, 5.3);
const SHARED_MATERIALS: Record<Exclude<MaterialGroup, 'livery'>, THREE.MeshStandardMaterial> = {
  carbon: new THREE.MeshStandardMaterial({ color: '#141820', metalness: 0.68, roughness: 0.38 }),
  tire: new THREE.MeshStandardMaterial({ color: '#090b0e', roughness: 0.88 }),
  metal: new THREE.MeshStandardMaterial({ color: '#aeb6bf', metalness: 0.85, roughness: 0.25 }),
  helmet: new THREE.MeshStandardMaterial({ color: '#f5f6f7', metalness: 0.15, roughness: 0.28 }),
  light: new THREE.MeshStandardMaterial({ color: '#ff1f35', emissive: '#ff1028', emissiveIntensity: 2.2 })
};

export const F1Car: React.FC<F1CarProps> = memo(({ carState, isAI = false, liveryColor, isDrafting = false, isOvertaking = false }) => {
  const root = useRef<THREE.Group>(null);
  const livery = liveryColor || '#e10600';

  useFrame(() => {
    if (!root.current) return;
    root.current.position.set(carState.position.x, carState.position.y, carState.position.z);
    root.current.rotation.set(carState.rotation.x, carState.rotation.y, carState.rotation.z, 'YXZ');
  });

  return (
    <group ref={root}>
      <mesh geometry={CAR_GEOMETRIES.carbon} material={SHARED_MATERIALS.carbon} castShadow receiveShadow />
      <mesh geometry={CAR_GEOMETRIES.livery} castShadow>
        <meshStandardMaterial color={livery} metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh geometry={CAR_GEOMETRIES.tire} material={SHARED_MATERIALS.tire} castShadow />
      <mesh geometry={CAR_GEOMETRIES.metal} material={SHARED_MATERIALS.metal} />
      <mesh geometry={CAR_GEOMETRIES.helmet} material={SHARED_MATERIALS.helmet} />
      <mesh geometry={CAR_GEOMETRIES.light} material={SHARED_MATERIALS.light} />
      <mesh geometry={SHADOW_GEOMETRY} position={[0, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#030508" transparent opacity={0.42} depthWrite={false} />
      </mesh>
      {isAI && (isDrafting || isOvertaking) && (
        <mesh position={[0, 1.48, -0.1]}>
          <octahedronGeometry args={[0.14, 0]} />
          <meshStandardMaterial color="#ffb000" emissive="#ffb000" emissiveIntensity={1.5} />
        </mesh>
      )}
    </group>
  );
});
