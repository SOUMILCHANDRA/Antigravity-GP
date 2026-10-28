import * as THREE from 'three';
import { SplinePoint } from '../types/track';

/**
 * Procedural 3D Conforming Terrain Engine
 * Computes exact natural continuous ground elevation at any (x, z)
 * across the circuit venue, forming realistic rolling hills, valleys, and plateaus.
 */
export function getTerrainHeight(
  x: number,
  z: number,
  splinePoints: SplinePoint[]
): number {
  if (!splinePoints || splinePoints.length === 0) {
    return -0.2;
  }

  // 1. Natural ambient rolling landscape (distant Ardennes / mountain swells)
  const ambientHill =
    Math.sin(x * 0.003) * Math.cos(z * 0.003) * 5.0 +
    Math.sin(x * 0.009 + 1.5) * 2.5;

  // 2. Find nearest track centerline segment and distance
  let minHorizDistSq = Infinity;
  let nearestY = 0;
  let nearestWidth = 14;
  let nearestRunoff = 8.5;
  let nearestBank = 0;
  let nearestBinormal = new THREE.Vector3(1, 0, 0);
  let nearestNormal = new THREE.Vector3(0, 1, 0);
  let nearestCenterX = 0;
  let nearestCenterZ = 0;

  const n = splinePoints.length;
  for (let i = 0; i < n; i++) {
    const p1 = splinePoints[i].position;
    const p2 = splinePoints[(i + 1) % n].position;
    const segX = p2.x - p1.x;
    const segZ = p2.z - p1.z;
    const lenSq = segX * segX + segZ * segZ;
    let t = 0;
    if (lenSq > 0.0001) {
      t = Math.max(0, Math.min(1, ((x - p1.x) * segX + (z - p1.z) * segZ) / lenSq));
    }
    const projX = p1.x + t * segX;
    const projZ = p1.z + t * segZ;
    const dx = x - projX;
    const dz = z - projZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < minHorizDistSq) {
      minHorizDistSq = distSq;
      nearestY = p1.y + t * (p2.y - p1.y);
      nearestCenterX = projX;
      nearestCenterZ = projZ;
      nearestWidth = splinePoints[i].width + t * (splinePoints[(i + 1) % n].width - splinePoints[i].width);
      const runoff1 = splinePoints[i].runoffWidth || 8.5;
      const runoff2 = splinePoints[(i + 1) % n].runoffWidth || 8.5;
      nearestRunoff = runoff1 + t * (runoff2 - runoff1);
      nearestBank = splinePoints[i].banking + t * (splinePoints[(i + 1) % n].banking - splinePoints[i].banking);
      nearestBinormal = new THREE.Vector3(
        splinePoints[i].binormal.x + t * (splinePoints[(i + 1) % n].binormal.x - splinePoints[i].binormal.x),
        splinePoints[i].binormal.y + t * (splinePoints[(i + 1) % n].binormal.y - splinePoints[i].binormal.y),
        splinePoints[i].binormal.z + t * (splinePoints[(i + 1) % n].binormal.z - splinePoints[i].binormal.z)
      ).normalize();
      nearestNormal = new THREE.Vector3(
        splinePoints[i].normal.x + t * (splinePoints[(i + 1) % n].normal.x - splinePoints[i].normal.x),
        splinePoints[i].normal.y + t * (splinePoints[(i + 1) % n].normal.y - splinePoints[i].normal.y),
        splinePoints[i].normal.z + t * (splinePoints[(i + 1) % n].normal.z - splinePoints[i].normal.z)
      ).normalize();
    }
  }

  const dist = Math.sqrt(minHorizDistSq);
  const trackCorridor = nearestWidth / 2 + nearestRunoff + 2.0;

  // Track and runoff are banked surfaces. Project the horizontal distance back
  // onto the 3D cross-track vector so terrain height matches the actual ribbon.
  const bankRad = nearestBank * (Math.PI / 180);
  const bLat = nearestBinormal.clone().multiplyScalar(Math.cos(bankRad))
    .addScaledVector(nearestNormal, Math.sin(bankRad));
  const horizontalLengthSq = bLat.x * bLat.x + bLat.z * bLat.z;
  const lateralOffset = horizontalLengthSq > 1e-6
    ? ((x - nearestCenterX) * bLat.x + (z - nearestCenterZ) * bLat.z) / horizontalLengthSq
    : 0;

  // 3. Keep terrain just below the banked track and runoff ribbon. The small
  // clearance prevents z-fighting while preserving the bank instead of burying
  // the low edge beneath a flat strip of land.
  if (dist <= trackCorridor) {
    const boundedOffset = THREE.MathUtils.clamp(lateralOffset, -trackCorridor, trackCorridor);
    return nearestY + bLat.y * boundedOffset - 0.2;
  }

  // 4. Smooth natural rolling slope connecting track to ambient terrain
  const slopeRange = Math.max(90.0, Math.abs(nearestY) * 5.5 + 70.0);
  const excess = dist - trackCorridor;
  const t = Math.min(1.0, excess / slopeRange);
  // Hermite smoothstep for natural organic terrain roll
  const ease = t * t * (3 - 2 * t);

  const edgeY = nearestY + bLat.y * THREE.MathUtils.clamp(lateralOffset, -trackCorridor, trackCorridor) - 0.2;
  return (1 - ease) * edgeY + ease * (ambientHill - 0.2);
}

/**
 * Creates high-detail procedural grass texture with turf striping and realistic surface variation
 */
export function createGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base lush grass gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#1E3A1E');
  grad.addColorStop(1, '#244524');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Mower turf stripes
  const stripeCount = 8;
  const stripeH = 512 / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(38, 72, 38, 0.22)' : 'rgba(18, 38, 18, 0.22)';
    ctx.fillRect(0, i * stripeH, 512, stripeH);
  }

  // Micro blade texture speckles
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * 16;
    d[i] = Math.min(255, Math.max(0, d[i] + noise * 0.7));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise * 1.1));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise * 0.6));
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(50, 50);
  return tex;
}
