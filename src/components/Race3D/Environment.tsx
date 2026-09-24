import React, { useMemo } from 'react';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';

export const Environment: React.FC = () => {
  // Generate instanced low-poly tree positions scattered around terrain
  const treePositions = useMemo(() => {
    const pos: [number, number, number][] = [];
    const radiusMin = 180;
    const radiusMax = 800;

    for (let i = 0; i < 160; i++) {
      const angle = (i / 160) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = radiusMin + Math.random() * (radiusMax - radiusMin);
      const x = Math.sin(angle) * dist;
      const z = Math.cos(angle) * dist;
      pos.push([x, 0, z]);
    }
    return pos;
  }, []);

  return (
    <>
      {/* Dynamic Motorsport Sky */}
      <Sky
        distance={450000}
        sunPosition={[120, 40, 100]}
        inclination={0.5}
        azimuth={0.25}
        turbidity={6}
        rayleigh={1.5}
      />

      <fog attach="fog" args={['#101724', 120, 850]} />

      {/* Sun & Environment Lights */}
      <directionalLight
        position={[180, 250, 120]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={1000}
        shadow-camera-left={-250}
        shadow-camera-right={250}
        shadow-camera-top={250}
        shadow-camera-bottom={-250}
      />

      <ambientLight intensity={0.5} color="#2A384E" />
      <hemisphereLight args={['#3B4E6B', '#162514', 0.6]} />

      {/* Surrounding Grass Terrain */}
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color="#182A1A" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Instanced Low-Poly Trees */}
      <group>
        {treePositions.map(([x, y, z], idx) => (
          <group key={idx} position={[x, y, z]}>
            {/* Trunk */}
            <mesh position={[0, 2, 0]} castShadow>
              <cylinderGeometry args={[0.3, 0.5, 4, 6]} />
              <meshStandardMaterial color="#3D2B1F" roughness={0.9} />
            </mesh>
            {/* Foliage Cone */}
            <mesh position={[0, 5.5, 0]} castShadow>
              <coneGeometry args={[2.2, 7, 6]} />
              <meshStandardMaterial color="#1E3A20" roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
};
