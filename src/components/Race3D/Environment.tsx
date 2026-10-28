import React, { useMemo } from 'react';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { SplinePoint } from '../../types/track';
import { getTerrainHeight, createGrassTexture } from '../../utils/terrain';

interface EnvironmentProps {
  splinePoints?: SplinePoint[];
}

export const Environment: React.FC<EnvironmentProps> = ({ splinePoints = [] }) => {
  const grassTex = useMemo(() => createGrassTexture(), []);

  // Generate 3D Conforming Terrain Mesh that contours to the track elevations
  const terrainGeom = useMemo(() => {
    if (!splinePoints || splinePoints.length < 2) {
      const plane = new THREE.PlaneGeometry(3500, 3500, 32, 32);
      plane.rotateX(-Math.PI / 2);
      return plane;
    }

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const pt of splinePoints) {
      if (pt.position.x < minX) minX = pt.position.x;
      if (pt.position.x > maxX) maxX = pt.position.x;
      if (pt.position.z < minZ) minZ = pt.position.z;
      if (pt.position.z > maxZ) maxZ = pt.position.z;
    }

    const margin = 500;
    const spanX = Math.max(1400, maxX - minX + margin * 2);
    const spanZ = Math.max(1400, maxZ - minZ + margin * 2);
    const originX = minX - margin;
    const originZ = minZ - margin;

    // Keep the terrain triangles small relative to a full-size circuit. A fixed
    // 120x120 grid left 20–30 m triangles beneath the new long-layout presets,
    // which could interpolate above the road between terrain samples.
    const segsX = Math.max(120, Math.min(240, Math.ceil(spanX / 16)));
    const segsZ = Math.max(120, Math.min(240, Math.ceil(spanZ / 16)));
    const geom = new THREE.PlaneGeometry(spanX, spanZ, segsX, segsZ);
    geom.rotateX(-Math.PI / 2);

    const posAttr = geom.attributes.position;
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i) + centerX;
      const vz = posAttr.getZ(i) + centerZ;
      const vy = getTerrainHeight(vx, vz, splinePoints);

      posAttr.setX(i, vx);
      posAttr.setY(i, vy);
      posAttr.setZ(i, vz);
    }

    geom.computeVertexNormals();
    return geom;
  }, [splinePoints]);

  // Generate Forest Groves safely OUTSIDE the track perimeter (> 36m away)
  const treePositions = useMemo(() => {
    const pos: [number, number, number, number][] = []; // x, y, z, scale
    if (!splinePoints || splinePoints.length < 2) {
      return pos;
    }

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (const pt of splinePoints) {
      if (pt.position.x < minX) minX = pt.position.x;
      if (pt.position.x > maxX) maxX = pt.position.x;
      if (pt.position.z < minZ) minZ = pt.position.z;
      if (pt.position.z > maxZ) maxZ = pt.position.z;
    }

    const margin = 450;
    const count = 180;

    for (let i = 0; i < count; i++) {
      // Clustered candidate positions
      const angle = Math.random() * Math.PI * 2;
      const r = 40 + Math.pow(Math.random(), 1.5) * (Math.max(maxX - minX, maxZ - minZ) / 2 + margin);
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      const tx = cx + Math.cos(angle) * r;
      const tz = cz + Math.sin(angle) * r;

      // Find distance to track
      let minDistSq = Infinity;
      for (let j = 0; j < splinePoints.length; j += 2) {
        const p = splinePoints[j].position;
        const dx = tx - p.x;
        const dz = tz - p.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < minDistSq) minDistSq = dSq;
      }

      // Keep trees at least 38m away from track centerline so they NEVER block track or view
      if (minDistSq < 38 * 38) continue;

      const ty = getTerrainHeight(tx, tz, splinePoints);
      const scale = 0.8 + Math.random() * 0.6;
      pos.push([tx, ty, tz, scale]);
    }

    return pos;
  }, [splinePoints]);

  return (
    <>
      {/* Dynamic Motorsport Atmosphere */}
      <Sky
        distance={450000}
        sunPosition={[250, 160, 220]}
        inclination={0.48}
        azimuth={0.22}
        turbidity={4}
        rayleigh={1.2}
      />

      <fog attach="fog" args={['#C4D6E8', 180, 1600]} />

      {/* Sun & Realistic Venue Lighting */}
      <directionalLight
        position={[250, 320, 200]}
        intensity={2.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={1800}
        shadow-camera-left={-450}
        shadow-camera-right={450}
        shadow-camera-top={450}
        shadow-camera-bottom={-450}
        shadow-bias={-0.0001}
      />

      <ambientLight intensity={0.55} color="#E2ECF8" />
      <hemisphereLight args={['#BBD5ED', '#243B22', 0.65]} />

      {/* 3D Continuous Conforming Terrain Hillside */}
      <mesh geometry={terrainGeom} receiveShadow>
        <meshStandardMaterial
          map={grassTex}
          roughness={0.92}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Instanced Forest Trees Clustered along Mountain Ridges */}
      <group>
        {treePositions.map(([x, y, z, scale], idx) => (
          <group key={idx} position={[x, y, z]} scale={[scale, scale, scale]}>
            {/* Dark Wooden Trunk */}
            <mesh position={[0, 2.5, 0]} castShadow>
              <cylinderGeometry args={[0.35, 0.6, 5, 6]} />
              <meshStandardMaterial color="#2E1F14" roughness={0.9} />
            </mesh>
            {/* Multi-Tier Ardennes Pine Foliage */}
            <mesh position={[0, 6.2, 0]} castShadow>
              <coneGeometry args={[3.0, 5.5, 7]} />
              <meshStandardMaterial color="#163518" roughness={0.85} />
            </mesh>
            <mesh position={[0, 9.2, 0]} castShadow>
              <coneGeometry args={[2.2, 4.8, 7]} />
              <meshStandardMaterial color="#1E4421" roughness={0.82} />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
};
