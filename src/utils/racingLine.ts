import { SplinePoint, Vector3D } from '../types/track';

export interface RacingLinePoint {
  position: Vector3D;
  color: [number, number, number]; // RGB 0..1
  curvature: number;
}

/**
 * Generates an authentic geometric ideal racing line with apex cutting and braking zones.
 */
export function generateIdealRacingLine(splinePoints: SplinePoint[]): RacingLinePoint[] {
  const n = splinePoints.length;
  if (n < 4) return [];

  // 1. Calculate raw signed curvature along the horizontal (X-Z) plane
  // A left turn has positive cross product; right turn has negative cross product
  const rawCurvatures: number[] = new Array(n).fill(0);
  const lookSpan = 4; // lookahead/behind window

  for (let i = 0; i < n; i++) {
    const prevIdx = (i - lookSpan + n) % n;
    const nextIdx = (i + lookSpan) % n;

    const pPrev = splinePoints[prevIdx].position;
    const pCurr = splinePoints[i].position;
    const pNext = splinePoints[nextIdx].position;

    const v1x = pCurr.x - pPrev.x;
    const v1z = pCurr.z - pPrev.z;
    const v2x = pNext.x - pCurr.x;
    const v2z = pNext.z - pCurr.z;

    const len1 = Math.hypot(v1x, v1z) || 1;
    const len2 = Math.hypot(v2x, v2z) || 1;

    // 2D cross product: v1x * v2z - v1z * v2x
    const cross = (v1x * v2z - v1z * v2x) / (len1 * len2);
    rawCurvatures[i] = cross;
  }

  // 2. Smooth curvature values
  const curvatures: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    const smoothRadius = 3;
    for (let r = -smoothRadius; r <= smoothRadius; r++) {
      const idx = (i + r + n) % n;
      sum += rawCurvatures[idx];
    }
    curvatures[i] = sum / (smoothRadius * 2 + 1);
  }

  // 3. Compute optimal lateral offset (out-in-out principle)
  // At apex: offset cuts towards the inside of the turn
  // For left turn (curvature > 0), apex is to the left (-binormal direction)
  // For right turn (curvature < 0), apex is to the right (+binormal direction)
  const targetOffsets: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const p = splinePoints[i];
    const halfWidth = p.width / 2;
    const maxOffset = halfWidth * 0.65; // keep well within asphalt boundaries

    const c = curvatures[i];
    const absC = Math.abs(c);
    
    // Scale offset with curvature magnitude
    const strength = Math.min(1.0, absC * 4.5);
    targetOffsets[i] = -Math.sign(c) * strength * maxOffset;
  }

  // 4. Apply Laplacian smoothing across offsets to create an out-in-out racing trajectory
  let currentOffsets = [...targetOffsets];
  const smoothingPasses = 14;
  for (let pass = 0; pass < smoothingPasses; pass++) {
    const nextOffsets = new Array(n);
    for (let i = 0; i < n; i++) {
      const prevIdx = (i - 1 + n) % n;
      const nextIdx = (i + 1) % n;
      // 3-point weighted average
      nextOffsets[i] = 0.25 * currentOffsets[prevIdx] + 0.5 * currentOffsets[i] + 0.25 * currentOffsets[nextIdx];
    }
    currentOffsets = nextOffsets;
  }

  // 5. Lookahead Braking Zones Calculation
  // Braking zones must start BEFORE the apex of sharp corners!
  const brakingIntensity: number[] = new Array(n).fill(0);
  const brakeLookahead = 14; // lookahead distance in spline segments

  for (let i = 0; i < n; i++) {
    let maxFutureCurvature = 0;
    for (let f = 0; f <= brakeLookahead; f++) {
      const futureIdx = (i + f) % n;
      const futureC = Math.abs(curvatures[futureIdx]);
      if (futureC > maxFutureCurvature) {
        maxFutureCurvature = futureC;
      }
    }
    // High future curvature triggers braking zone
    const severity = Math.min(1.0, Math.max(0, (maxFutureCurvature - 0.08) / 0.16));
    brakingIntensity[i] = severity;
  }

  // 6. Build final RacingLinePoint array with vertex positions and colors
  const points: RacingLinePoint[] = [];

  for (let i = 0; i < n; i++) {
    const sp = splinePoints[i];
    const offset = currentOffsets[i];

    // Lateral displacement along binormal
    const x = sp.position.x + sp.binormal.x * offset;
    const y = sp.position.y + 0.025; // Hover slightly above asphalt to prevent z-fighting
    const z = sp.position.z + sp.binormal.z * offset;

    // Color gradient based on braking severity:
    // Green (0, 0.9, 0.46) -> Yellow (1.0, 0.84, 0.0) -> Red (1.0, 0.09, 0.27)
    const b = brakingIntensity[i];
    let r = 0;
    let g = 0.9;
    let bl = 0.46;

    if (b < 0.4) {
      // Green to Yellow
      const t = b / 0.4;
      r = t * 1.0;
      g = 0.9 - t * 0.06;
      bl = 0.46 * (1 - t);
    } else {
      // Yellow to Red
      const t = (b - 0.4) / 0.6;
      r = 1.0;
      g = 0.84 * (1 - t);
      bl = 0.09 * (1 - t) + 0.27 * t;
    }

    points.push({
      position: { x, y, z },
      color: [r, g, bl],
      curvature: curvatures[i]
    });
  }

  return points;
}
