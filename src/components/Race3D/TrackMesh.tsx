import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
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

// Trackside 3D Barriers from modular_track_roads_free.glb
function ModularTrackBarriers({ splinePoints }: { splinePoints: SplinePoint[] }) {
  const { scene } = useGLTF('/modular_track_roads_free.glb');

  // Extract fence mesh and tyre barrier meshes
  const barrierMeshes = useMemo(() => {
    let fenceGeom: THREE.BufferGeometry | null = null;
    let redBlockGeom: THREE.BufferGeometry | null = null;
    let whiteBlockGeom: THREE.BufferGeometry | null = null;
    let material: THREE.Material | THREE.Material[] | null = null;

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (child.name.includes('15m') || child.name.includes('Object_8')) {
          fenceGeom = mesh.geometry.clone();
          material = mesh.material;
        } else if (child.name.includes('red') || child.name.includes('Object_4')) {
          redBlockGeom = mesh.geometry.clone();
        } else if (child.name.includes('white') || child.name.includes('Object_6')) {
          whiteBlockGeom = mesh.geometry.clone();
        }
      }
    });

    return { fenceGeom, redBlockGeom, whiteBlockGeom, material };
  }, [scene]);

  // Compute barrier transform matrices along outer gravel perimeter
  const barrierTransforms = useMemo(() => {
    if (splinePoints.length < 4) return [];

    const transforms: { pos: [number, number, number]; rotY: number; isWhite: boolean }[] = [];
    const step = Math.max(1, Math.floor(splinePoints.length / 50)); // Place barriers evenly around track

    for (let i = 0; i < splinePoints.length; i += step) {
      const p = splinePoints[i];
      const nextP = splinePoints[(i + 1) % splinePoints.length];
      const halfW = p.width / 2 + 8.8; // Outside gravel trap

      // Left Barrier
      const lx = p.position.x - p.binormal.x * halfW;
      const lz = p.position.z - p.binormal.z * halfW;
      const yawL = Math.atan2(nextP.tangent.x, nextP.tangent.z);
      transforms.push({ pos: [lx, p.position.y, lz], rotY: yawL, isWhite: i % 2 === 0 });

      // Right Barrier
      const rx = p.position.x + p.binormal.x * halfW;
      const rz = p.position.z + p.binormal.z * halfW;
      transforms.push({ pos: [rx, p.position.y, rz], rotY: yawL, isWhite: i % 2 !== 0 });
    }

    return transforms;
  }, [splinePoints]);

  if (!barrierMeshes.fenceGeom && !barrierMeshes.redBlockGeom) return null;

  return (
    <group>
      {barrierTransforms.map((b, idx) => (
        <group key={idx} position={b.pos} rotation={[0, b.rotY, 0]}>
          {barrierMeshes.redBlockGeom && (
            <mesh
              geometry={b.isWhite && barrierMeshes.whiteBlockGeom ? barrierMeshes.whiteBlockGeom : barrierMeshes.redBlockGeom}
              material={barrierMeshes.material || undefined}
              scale={[1.2, 1.2, 1.2]}
              castShadow
              receiveShadow
            />
          )}
        </group>
      ))}
    </group>
  );
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

    const kerbWidth = 0.65;  // 0.65m F1 kerbs along road edge
    const gravelWidth = 8.5; // 8.5m deep sand/gravel trap outside kerb

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

      // 2. Left Kerb Strip (from clx to lx, offset y + 0.015)
      const clx = lx - p.binormal.x * kerbWidth;
      const clz = lz - p.binormal.z * kerbWidth;
      lCurbVerts.push(clx, ly + 0.015, clz, lx, ly + 0.015, lz);

      // 3. Right Kerb Strip (from rx to crx, offset y + 0.015)
      const crx = rx + p.binormal.x * kerbWidth;
      const crz = rz + p.binormal.z * kerbWidth;
      rCurbVerts.push(rx, ry + 0.015, rz, crx, ry + 0.015, crz);

      // 4. Left Sand/Gravel Trap Strip (from rfxL to clx)
      const rfxL_x = clx - p.binormal.x * gravelWidth;
      const rfxL_z = clz - p.binormal.z * gravelWidth;
      lRunoffVerts.push(rfxL_x, ly - 0.01, rfxL_z, clx, ly - 0.01, clz);

      // 5. Right Sand/Gravel Trap Strip (from crx to rfxR)
      const rfxR_x = crx + p.binormal.x * gravelWidth;
      const rfxR_z = crz + p.binormal.z * gravelWidth;
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
      {/* 1. Left Sand / Gravel Trap */}
      {leftRunoffGeom && (
        <mesh geometry={leftRunoffGeom} receiveShadow>
          <meshStandardMaterial color="#C89D66" roughness={0.96} metalness={0.05} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 2. Right Sand / Gravel Trap */}
      {rightRunoffGeom && (
        <mesh geometry={rightRunoffGeom} receiveShadow>
          <meshStandardMaterial color="#C89D66" roughness={0.96} metalness={0.05} side={THREE.DoubleSide} />
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

      {/* 6. Modular 3D Tyre Barriers and Trackside Elements */}
      <ModularTrackBarriers splinePoints={splinePoints} />

      {/* 7. Start / Finish Line Arch Bridge */}
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

useGLTF.preload('/modular_track_roads_free.glb');
