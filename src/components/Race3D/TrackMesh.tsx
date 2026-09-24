import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SplinePoint, TrackConfig } from '../../types/track';

function createCheckeredTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const rows = 4;
  const cols = 16;
  const w = canvas.width / cols;
  const h = canvas.height / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#FFFFFF' : '#111827';
      ctx.fillRect(c * w, r * h, w, h);
    }
  }

  // Red border line
  ctx.strokeStyle = '#E10600';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  return new THREE.CanvasTexture(canvas);
}

interface TrackMeshProps {
  splinePoints: SplinePoint[];
  trackConfig: TrackConfig;
}

export const TrackMesh: React.FC<TrackMeshProps> = ({ splinePoints, trackConfig }) => {
  // Rebuild road mesh cleanly with non-overlapping adjacent strips to eliminate Z-fighting
  const { asphaltGeom, leftCurbGeom, rightCurbGeom, leftRunoffGeom, rightRunoffGeom } = useMemo(() => {
    if (splinePoints.length < 2) {
      return {
        asphaltGeom: null,
        leftCurbGeom: null,
        rightCurbGeom: null,
        leftRunoffGeom: null,
        rightRunoffGeom: null
      };
    }

    const numPoints = splinePoints.length;

    const asphaltVerts: number[] = [];
    const asphaltUvs: number[] = [];
    const quadIndices: number[] = [];

    const lCurbVerts: number[] = [];
    const rCurbVerts: number[] = [];
    const lRunoffVerts: number[] = [];
    const rRunoffVerts: number[] = [];

    const kerbWidth = 0.35;  // 0.35m kerb strip along road edge
    const runoffWidth = 3.0; // 3.0m runoff outside kerb

    for (let i = 0; i < numPoints; i++) {
      const p = splinePoints[i];
      const halfW = p.width / 2;

      // Track edge coordinates (on spline surface)
      const lx = p.position.x - p.binormal.x * halfW;
      const ly = p.position.y;
      const lz = p.position.z - p.binormal.z * halfW;

      const rx = p.position.x + p.binormal.x * halfW;
      const ry = p.position.y;
      const rz = p.position.z + p.binormal.z * halfW;

      // 1. Asphalt Road Vertices (from lx to rx)
      asphaltVerts.push(lx, ly, lz, rx, ry, rz);

      const v = i / (numPoints - 1);
      asphaltUvs.push(0, v * 25, 1, v * 25);

      // 2. Left Kerb Strip (from clx to lx, offset y + 0.01)
      const clx = lx - p.binormal.x * kerbWidth;
      const clz = lz - p.binormal.z * kerbWidth;
      lCurbVerts.push(clx, ly + 0.01, clz, lx, ly + 0.01, lz);

      // 3. Right Kerb Strip (from rx to crx, offset y + 0.01)
      const crx = rx + p.binormal.x * kerbWidth;
      const crz = rz + p.binormal.z * kerbWidth;
      rCurbVerts.push(rx, ry + 0.01, rz, crx, ry + 0.01, crz);

      // 4. Left Runoff Strip (from rfxL to clx, NOT underneath road)
      const rfxL_x = clx - p.binormal.x * runoffWidth;
      const rfxL_z = clz - p.binormal.z * runoffWidth;
      lRunoffVerts.push(rfxL_x, ly - 0.01, rfxL_z, clx, ly - 0.01, clz);

      // 5. Right Runoff Strip (from crx to rfxR, NOT underneath road)
      const rfxR_x = crx + p.binormal.x * runoffWidth;
      const rfxR_z = crz + p.binormal.z * runoffWidth;
      rRunoffVerts.push(crx, ry - 0.01, crz, rfxR_x, ry - 0.01, rfxR_z);

      // Quad indices
      if (i < numPoints - 1) {
        const idx = i * 2;
        quadIndices.push(idx, idx + 1, idx + 2);
        quadIndices.push(idx + 1, idx + 3, idx + 2);
      }
    }

    // Connect closing loop cleanly
    if (trackConfig.isClosed && numPoints > 2) {
      const lastIdx = (numPoints - 1) * 2;
      quadIndices.push(lastIdx, lastIdx + 1, 0);
      quadIndices.push(lastIdx + 1, 1, 0);
    }

    const aGeom = new THREE.BufferGeometry();
    aGeom.setAttribute('position', new THREE.Float32BufferAttribute(asphaltVerts, 3));
    aGeom.setAttribute('uv', new THREE.Float32BufferAttribute(asphaltUvs, 2));
    aGeom.setIndex(quadIndices);
    aGeom.computeVertexNormals();

    const lcGeom = new THREE.BufferGeometry();
    lcGeom.setAttribute('position', new THREE.Float32BufferAttribute(lCurbVerts, 3));
    lcGeom.setIndex(quadIndices);
    lcGeom.computeVertexNormals();

    const rcGeom = new THREE.BufferGeometry();
    rcGeom.setAttribute('position', new THREE.Float32BufferAttribute(rCurbVerts, 3));
    rcGeom.setIndex(quadIndices);
    rcGeom.computeVertexNormals();

    const lroGeom = new THREE.BufferGeometry();
    lroGeom.setAttribute('position', new THREE.Float32BufferAttribute(lRunoffVerts, 3));
    lroGeom.setIndex(quadIndices);
    lroGeom.computeVertexNormals();

    const rroGeom = new THREE.BufferGeometry();
    rroGeom.setAttribute('position', new THREE.Float32BufferAttribute(rRunoffVerts, 3));
    rroGeom.setIndex(quadIndices);
    rroGeom.computeVertexNormals();

    return {
      asphaltGeom: aGeom,
      leftCurbGeom: lcGeom,
      rightCurbGeom: rcGeom,
      leftRunoffGeom: lroGeom,
      rightRunoffGeom: rroGeom
    };
  }, [splinePoints, trackConfig.isClosed]);

  if (!asphaltGeom) return null;

  const startP = splinePoints[0];
  const gantryPos: [number, number, number] = startP ? [startP.position.x, startP.position.y, startP.position.z] : [0, 0, 0];
  const gantryAngle = startP ? Math.atan2(startP.tangent.x, startP.tangent.z) : 0;

  const checkeredTex = useMemo(() => createCheckeredTexture(), []);

  return (
    <group>
      {/* 1. Left Runoff Strip (Adjacent, non-overlapping) */}
      {leftRunoffGeom && (
        <mesh geometry={leftRunoffGeom} receiveShadow>
          <meshStandardMaterial color="#3A3F47" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 2. Right Runoff Strip (Adjacent, non-overlapping) */}
      {rightRunoffGeom && (
        <mesh geometry={rightRunoffGeom} receiveShadow>
          <meshStandardMaterial color="#3A3F47" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 3. Main Charcoal Asphalt Road */}
      <mesh geometry={asphaltGeom} receiveShadow castShadow>
        <meshStandardMaterial
          color="#222831"
          roughness={0.8}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 4. Left Kerb Strip (Adjacent, non-overlapping) */}
      {leftCurbGeom && (
        <mesh geometry={leftCurbGeom}>
          <meshStandardMaterial color="#E10600" roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 5. Right Kerb Strip (Adjacent, non-overlapping) */}
      {rightCurbGeom && (
        <mesh geometry={rightCurbGeom}>
          <meshStandardMaterial color="#F8FAFC" roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 6. Start / Finish Line Arch Bridge */}
      {startP && (
        <group position={gantryPos} rotation={[0, gantryAngle, 0]}>
          <mesh position={[-startP.width / 2 - 1.2, 4.2, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 8.4, 12]} />
            <meshStandardMaterial color="#1E2638" metalness={0.8} />
          </mesh>

          <mesh position={[startP.width / 2 + 1.2, 4.2, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 8.4, 12]} />
            <meshStandardMaterial color="#1E2638" metalness={0.8} />
          </mesh>

          <mesh position={[0, 8.4, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.3, 0.3, startP.width + 2.7, 12]} />
            <meshStandardMaterial color="#E10600" metalness={0.6} />
          </mesh>

          {/* High-Visibility Checkered Finish Line Marker */}
          <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[startP.width, 2.5]} />
            <meshBasicMaterial map={checkeredTex} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
};
