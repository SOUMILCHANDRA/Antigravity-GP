import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SplinePoint, TrackConfig } from '../../types/track';
import { VenueFacilities } from './VenueFacilities';

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

function createCurbTexture(style: string = 'red_white'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  let color1 = '#E10600';
  let color2 = '#F8FAFC';

  if (style === 'blue_yellow') {
    color1 = '#0055D4';
    color2 = '#FFD200';
  } else if (style === 'green_white') {
    color1 = '#00873D';
    color2 = '#FFFFFF';
  } else if (style === 'monza_black_yellow') {
    color1 = '#18181B';
    color2 = '#FFD200';
  } else if (style === 'flat_kerb') {
    color1 = '#94A3B8';
    color2 = '#CBD5E1';
  }

  const stripes = 4;
  const w = canvas.width / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? color1 : color2;
    ctx.fillRect(i * w, 0, w, canvas.height);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(80, 1);
  return tex;
}

function createPitLimitTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#EAB308'; // Safety Yellow
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(i * 32, 0, 16, 32);
  }
  return new THREE.CanvasTexture(canvas);
}

interface TrackMeshProps {
  splinePoints: SplinePoint[];
  trackConfig: TrackConfig;
}

export const TrackMesh: React.FC<TrackMeshProps> = ({ splinePoints, trackConfig }) => {
  const dressing = trackConfig.dressing;
  const pitLane = trackConfig.pitLane;

  // Rebuild road mesh cleanly with non-overlapping adjacent strips to eliminate Z-fighting
  const { 
    asphaltGeom, 
    leftCurbGeom, 
    rightCurbGeom, 
    leftRunoffGeom, 
    rightRunoffGeom,
    pitLaneGeom,
    pitWallGeom
  } = useMemo(() => {
    if (splinePoints.length < 2) {
      return {
        asphaltGeom: null,
        leftCurbGeom: null,
        rightCurbGeom: null,
        leftRunoffGeom: null,
        rightRunoffGeom: null,
        pitLaneGeom: null,
        pitWallGeom: null
      };
    }

    const numPoints = splinePoints.length;

    const asphaltVerts: number[] = [];
    const asphaltUvs: number[] = [];
    const quadIndices: number[] = [];

    const lCurbVerts: number[] = [];
    const lCurbUvs: number[] = [];
    const rCurbVerts: number[] = [];
    const rCurbUvs: number[] = [];
    const curbIndices: number[] = [];

    const lRunoffVerts: number[] = [];
    const rRunoffVerts: number[] = [];

    const kerbWidth = 0.65; // 0.65m F1 kerbs along road edge

    for (let i = 0; i < numPoints; i++) {
      const p = splinePoints[i];
      const halfW = p.width / 2;
      const gravelW = p.runoffWidth || 8.5; // per-point runoff width

      // Banked normal and binormal: rotate around tangent by banking angle
      const bankRad = (p.banking || 0) * (Math.PI / 180);
      const cosB = Math.cos(bankRad);
      const sinB = Math.sin(bankRad);

      // Banked lateral vector: cos(B) * binormal + sin(B) * normal
      const bLatX = p.binormal.x * cosB + p.normal.x * sinB;
      const bLatY = p.binormal.y * cosB + p.normal.y * sinB;
      const bLatZ = p.binormal.z * cosB + p.normal.z * sinB;

      // Banked up vector: -sin(B) * binormal + cos(B) * normal
      const bUpX = -p.binormal.x * sinB + p.normal.x * cosB;
      const bUpY = -p.binormal.y * sinB + p.normal.y * cosB;
      const bUpZ = -p.binormal.z * sinB + p.normal.z * cosB;

      // Track edge coordinates (on spline surface)
      const lx = p.position.x - bLatX * halfW;
      const ly = p.position.y - bLatY * halfW;
      const lz = p.position.z - bLatZ * halfW;

      const rx = p.position.x + bLatX * halfW;
      const ry = p.position.y + bLatY * halfW;
      const rz = p.position.z + bLatZ * halfW;

      // 1. Asphalt Road Vertices (from lx to rx)
      asphaltVerts.push(lx, ly, lz, rx, ry, rz);

      const v = i / (numPoints - 1);
      asphaltUvs.push(0, v * 25, 1, v * 25);

      // 2. Left Kerb Strip (from clx to lx, offset slightly above road along banked up)
      const clx = lx - bLatX * kerbWidth;
      const cly = ly - bLatY * kerbWidth;
      const clz = lz - bLatZ * kerbWidth;
      const kerbLift = 0.015;
      lCurbVerts.push(
        clx + bUpX * kerbLift, cly + bUpY * kerbLift, clz + bUpZ * kerbLift,
        lx + bUpX * kerbLift, ly + bUpY * kerbLift, lz + bUpZ * kerbLift
      );
      lCurbUvs.push(0, v * 80, 1, v * 80);

      // 3. Right Kerb Strip (from rx to crx, offset slightly above road along banked up)
      const crx = rx + bLatX * kerbWidth;
      const cry = ry + bLatY * kerbWidth;
      const crz = rz + bLatZ * kerbWidth;
      rCurbVerts.push(
        rx + bUpX * kerbLift, ry + bUpY * kerbLift, rz + bUpZ * kerbLift,
        crx + bUpX * kerbLift, cry + bUpY * kerbLift, crz + bUpZ * kerbLift
      );
      rCurbUvs.push(0, v * 80, 1, v * 80);

      // 4. Left Sand/Gravel Trap Strip (from rfxL to clx, width = p.runoffWidth)
      const rfxL_x = clx - bLatX * gravelW;
      const rfxL_y = cly - bLatY * gravelW;
      const rfxL_z = clz - bLatZ * gravelW;
      const gravelDip = -0.01;
      lRunoffVerts.push(
        rfxL_x + bUpX * gravelDip, rfxL_y + bUpY * gravelDip, rfxL_z + bUpZ * gravelDip,
        clx + bUpX * gravelDip, cly + bUpY * gravelDip, clz + bUpZ * gravelDip
      );

      // 5. Right Sand/Gravel Trap Strip (from crx to rfxR, width = p.runoffWidth)
      const rfxR_x = crx + bLatX * gravelW;
      const rfxR_y = cry + bLatY * gravelW;
      const rfxR_z = crz + bLatZ * gravelW;
      rRunoffVerts.push(
        crx + bUpX * gravelDip, cry + bUpY * gravelDip, crz + bUpZ * gravelDip,
        rfxR_x + bUpX * gravelDip, rfxR_y + bUpY * gravelDip, rfxR_z + bUpZ * gravelDip
      );

      // Quad indices
      if (i < numPoints - 1) {
        const idx = i * 2;
        quadIndices.push(idx, idx + 1, idx + 2);
        quadIndices.push(idx + 1, idx + 3, idx + 2);
        curbIndices.push(idx, idx + 1, idx + 2);
        curbIndices.push(idx + 1, idx + 3, idx + 2);
      }
    }

    // Connect closing loop cleanly
    if (trackConfig.isClosed && numPoints > 2) {
      const lastIdx = (numPoints - 1) * 2;
      quadIndices.push(lastIdx, lastIdx + 1, 0);
      quadIndices.push(lastIdx + 1, 1, 0);
      curbIndices.push(lastIdx, lastIdx + 1, 0);
      curbIndices.push(lastIdx + 1, 1, 0);
    }

    const aGeom = new THREE.BufferGeometry();
    aGeom.setAttribute('position', new THREE.Float32BufferAttribute(asphaltVerts, 3));
    aGeom.setAttribute('uv', new THREE.Float32BufferAttribute(asphaltUvs, 2));
    aGeom.setIndex(quadIndices);
    aGeom.computeVertexNormals();

    const lcGeom = new THREE.BufferGeometry();
    lcGeom.setAttribute('position', new THREE.Float32BufferAttribute(lCurbVerts, 3));
    lcGeom.setAttribute('uv', new THREE.Float32BufferAttribute(lCurbUvs, 2));
    lcGeom.setIndex(curbIndices);
    lcGeom.computeVertexNormals();

    const rcGeom = new THREE.BufferGeometry();
    rcGeom.setAttribute('position', new THREE.Float32BufferAttribute(rCurbVerts, 3));
    rcGeom.setAttribute('uv', new THREE.Float32BufferAttribute(rCurbUvs, 2));
    rcGeom.setIndex(curbIndices);
    rcGeom.computeVertexNormals();

    const lroGeom = new THREE.BufferGeometry();
    lroGeom.setAttribute('position', new THREE.Float32BufferAttribute(lRunoffVerts, 3));
    lroGeom.setIndex(quadIndices);
    lroGeom.computeVertexNormals();

    const rroGeom = new THREE.BufferGeometry();
    rroGeom.setAttribute('position', new THREE.Float32BufferAttribute(rRunoffVerts, 3));
    rroGeom.setIndex(quadIndices);
    rroGeom.computeVertexNormals();

    // 6. Pit Lane Road & Concrete Pit Wall Geometry (if enabled)
    let pLaneGeom: THREE.BufferGeometry | null = null;
    let pWallGeom: THREE.BufferGeometry | null = null;

    if (pitLane?.enabled && numPoints > 40) {
      const isRight = pitLane.side !== 'left';
      const sideMult = isRight ? 1 : -1;
      const pitRoadWidth = pitLane.width || 7.5;
      const pitLaneIndices: number[] = [];
      const pitLaneVerts: number[] = [];
      const pitWallVerts: number[] = [];
      const pitWallIndices: number[] = [];

      // Pit lane spans before and after start/finish line (index 0)
      const pitSpan = Math.min(30, Math.floor(numPoints * 0.08));
      const pitIndicesSeq: number[] = [];
      for (let i = numPoints - pitSpan; i < numPoints; i++) pitIndicesSeq.push(i);
      for (let i = 0; i <= pitSpan; i++) pitIndicesSeq.push(i);

      const totalPitSteps = pitIndicesSeq.length;
      for (let sIdx = 0; sIdx < totalPitSteps; sIdx++) {
        const pIdx = pitIndicesSeq[sIdx];
        const p = splinePoints[pIdx];
        const halfW = p.width / 2;

        // Taper width at pit entry (first 5 points) and pit exit (last 5 points)
        let taper = 1.0;
        if (sIdx < 5) taper = sIdx / 5;
        else if (sIdx > totalPitSteps - 6) taper = (totalPitSteps - 1 - sIdx) / 5;

        const currentW = Math.max(0.5, pitRoadWidth * taper);
        const wallOffset = halfW + 0.4;
        const roadInner = halfW + 0.9;
        const roadOuter = roadInner + currentW;

        // Pit Lane Ribbon
        const inX = p.position.x + p.binormal.x * sideMult * roadInner;
        const inY = p.position.y + 0.01;
        const inZ = p.position.z + p.binormal.z * sideMult * roadInner;

        const outX = p.position.x + p.binormal.x * sideMult * roadOuter;
        const outY = p.position.y + 0.01;
        const outZ = p.position.z + p.binormal.z * sideMult * roadOuter;

        pitLaneVerts.push(inX, inY, inZ, outX, outY, outZ);

        // Pit Wall (1.1m concrete barrier along wallOffset)
        const wx = p.position.x + p.binormal.x * sideMult * wallOffset;
        const wy = p.position.y;
        const wz = p.position.z + p.binormal.z * sideMult * wallOffset;
        pitWallVerts.push(wx, wy, wz, wx, wy + 1.1, wz);

        if (sIdx < totalPitSteps - 1) {
          const vIdx = sIdx * 2;
          pitLaneIndices.push(vIdx, vIdx + 1, vIdx + 2);
          pitLaneIndices.push(vIdx + 1, vIdx + 3, vIdx + 2);

          pitWallIndices.push(vIdx, vIdx + 1, vIdx + 2);
          pitWallIndices.push(vIdx + 1, vIdx + 3, vIdx + 2);
        }
      }

      pLaneGeom = new THREE.BufferGeometry();
      pLaneGeom.setAttribute('position', new THREE.Float32BufferAttribute(pitLaneVerts, 3));
      pLaneGeom.setIndex(pitLaneIndices);
      pLaneGeom.computeVertexNormals();

      pWallGeom = new THREE.BufferGeometry();
      pWallGeom.setAttribute('position', new THREE.Float32BufferAttribute(pitWallVerts, 3));
      pWallGeom.setIndex(pitWallIndices);
      pWallGeom.computeVertexNormals();
    }

    return {
      asphaltGeom: aGeom,
      leftCurbGeom: lcGeom,
      rightCurbGeom: rcGeom,
      leftRunoffGeom: lroGeom,
      rightRunoffGeom: rroGeom,
      pitLaneGeom: pLaneGeom,
      pitWallGeom: pWallGeom
    };
  }, [splinePoints, trackConfig.isClosed, pitLane?.enabled, pitLane?.side, pitLane?.width]);

  if (!asphaltGeom) return null;

  const startP = splinePoints[0];
  const gantryPos: [number, number, number] = startP ? [startP.position.x, startP.position.y, startP.position.z] : [0, 0, 0];
  const gantryAngle = startP ? Math.atan2(startP.tangent.x, startP.tangent.z) : 0;

  const checkeredTex = useMemo(() => createCheckeredTexture(), []);
  const curbTex = useMemo(() => createCurbTexture(dressing?.curbStyle), [dressing?.curbStyle]);

  // Asphalt surface styling parameters
  const asphaltProps = useMemo(() => {
    switch (dressing?.asphaltStyle) {
      case 'classic_weathered':
        return { color: '#2E3644', roughness: 0.90, metalness: 0.05 };
      case 'street_concrete':
        return { color: '#3A4150', roughness: 0.75, metalness: 0.1 };
      case 'night_circuit':
        return { color: '#10141C', roughness: 0.45, metalness: 0.25 };
      case 'modern_f1':
      default:
        return { color: '#1C2128', roughness: 0.82, metalness: 0.1 };
    }
  }, [dressing?.asphaltStyle]);

  // Runoff styling parameters
  const runoffColor = useMemo(() => {
    switch (dressing?.runoffStyle) {
      case 'asphalt_stripes':
        return '#0F172A';
      case 'grass_verge':
        return '#2D5A27';
      case 'gravel_trap':
      default:
        return '#C89D66';
    }
  }, [dressing?.runoffStyle]);

  return (
    <group name="track-mesh-hierarchy">
      {/* 1. Left Runoff Safety Zone */}
      {leftRunoffGeom && (
        <mesh geometry={leftRunoffGeom} receiveShadow>
          <meshStandardMaterial color={runoffColor} roughness={0.96} metalness={0.05} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 2. Right Runoff Safety Zone */}
      {rightRunoffGeom && (
        <mesh geometry={rightRunoffGeom} receiveShadow>
          <meshStandardMaterial color={runoffColor} roughness={0.96} metalness={0.05} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 3. Main Asphalt Road Ribbon */}
      <mesh geometry={asphaltGeom} receiveShadow castShadow>
        <meshStandardMaterial
          color={asphaltProps.color}
          roughness={asphaltProps.roughness}
          metalness={asphaltProps.metalness}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 4. Left Kerb Strip with Dynamic Style */}
      {leftCurbGeom && (
        <mesh geometry={leftCurbGeom}>
          <meshStandardMaterial map={curbTex} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 5. Right Kerb Strip with Dynamic Style */}
      {rightCurbGeom && (
        <mesh geometry={rightCurbGeom}>
          <meshStandardMaterial map={curbTex} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 6. Pit Lane Road Surface */}
      {pitLaneGeom && (
        <mesh geometry={pitLaneGeom} receiveShadow>
          <meshStandardMaterial color="#333A48" roughness={0.7} metalness={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 7. Concrete Pit Wall Barrier */}
      {pitWallGeom && (
        <mesh geometry={pitWallGeom} receiveShadow castShadow>
          <meshStandardMaterial color="#475569" roughness={0.8} metalness={0.2} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 8. 3D Venue Facilities Library */}
      <VenueFacilities facilities={trackConfig.facilities} splinePoints={splinePoints} />

      {/* 9. Start / Finish Line Arch Bridge */}
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
