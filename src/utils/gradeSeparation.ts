import { SplinePoint } from '../types/track';
import { getAmbientTerrainHeight } from './terrain';

interface Crossing {
  x: number;
  z: number;
  firstIndex: number;
  firstT: number;
  secondIndex: number;
  secondT: number;
}

interface SegmentPairClosestPoint {
  firstT: number;
  secondT: number;
  x: number;
  z: number;
  gap: number;
  intersects: boolean;
}

const cross = (ax: number, az: number, bx: number, bz: number) => ax * bz - az * bx;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

function projectPointToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): { t: number; x: number; z: number } {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq > 1e-8
    ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lengthSq))
    : 0;
  return { t, x: ax + dx * t, z: az + dz * t };
}

function closestPointBetweenSegments(
  a: { x: number; z: number },
  b: { x: number; z: number },
  c: { x: number; z: number },
  d: { x: number; z: number }
): SegmentPairClosestPoint {
  const rx = b.x - a.x;
  const rz = b.z - a.z;
  const sx = d.x - c.x;
  const sz = d.z - c.z;
  const denominator = cross(rx, rz, sx, sz);

  if (Math.abs(denominator) > 1e-8) {
    const cax = c.x - a.x;
    const caz = c.z - a.z;
    const firstT = cross(cax, caz, sx, sz) / denominator;
    const secondT = cross(cax, caz, rx, rz) / denominator;
    if (firstT >= -1e-4 && firstT <= 1.0001 && secondT >= -1e-4 && secondT <= 1.0001) {
      const t = Math.max(0, Math.min(1, firstT));
      const u = Math.max(0, Math.min(1, secondT));
      const firstX = a.x + rx * t;
      const firstZ = a.z + rz * t;
      const secondX = c.x + sx * u;
      const secondZ = c.z + sz * u;
      return {
        firstT: t,
        secondT: u,
        x: (firstX + secondX) / 2,
        z: (firstZ + secondZ) / 2,
        gap: Math.hypot(firstX - secondX, firstZ - secondZ),
        intersects: true
      };
    }
  }

  const candidates = [
    (() => { const p = projectPointToSegment(a.x, a.z, c.x, c.z, d.x, d.z); return { firstT: 0, secondT: p.t, firstX: a.x, firstZ: a.z, secondX: p.x, secondZ: p.z }; })(),
    (() => { const p = projectPointToSegment(b.x, b.z, c.x, c.z, d.x, d.z); return { firstT: 1, secondT: p.t, firstX: b.x, firstZ: b.z, secondX: p.x, secondZ: p.z }; })(),
    (() => { const p = projectPointToSegment(c.x, c.z, a.x, a.z, b.x, b.z); return { firstT: p.t, secondT: 0, firstX: p.x, firstZ: p.z, secondX: c.x, secondZ: c.z }; })(),
    (() => { const p = projectPointToSegment(d.x, d.z, a.x, a.z, b.x, b.z); return { firstT: p.t, secondT: 1, firstX: p.x, firstZ: p.z, secondX: d.x, secondZ: d.z }; })()
  ];
  let closest = {
    ...candidates[0],
    gap: Math.hypot(candidates[0].firstX - candidates[0].secondX, candidates[0].firstZ - candidates[0].secondZ)
  };
  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i];
    const gap = Math.hypot(candidate.firstX - candidate.secondX, candidate.firstZ - candidate.secondZ);
    if (gap < closest.gap) closest = { ...candidate, gap };
  }

  return {
    firstT: closest.firstT,
    secondT: closest.secondT,
    x: (closest.firstX + closest.secondX) / 2,
    z: (closest.firstZ + closest.secondZ) / 2,
    gap: closest.gap,
    intersects: false
  };
}

function findCrossings(points: SplinePoint[], closed: boolean): Crossing[] {
  const count = points.length;
  const crossings: Crossing[] = [];
  const segmentCount = closed ? count : count - 1;
  const sampleStep = points[count - 1].distance / Math.max(1, count - 1);
  const trackLength = closed ? points[count - 1].distance + sampleStep : points[count - 1].distance;

  for (let i = 0; i < segmentCount; i++) {
    const a = points[i].position;
    const b = points[(i + 1) % count].position;
    const rx = b.x - a.x;
    const rz = b.z - a.z;
    const firstLength = Math.hypot(rx, rz);
    if (firstLength < 1e-3) continue;

    for (let j = i + 2; j < segmentCount; j++) {
      if (closed && i === 0 && j >= count - 1) continue;

      const c = points[j].position;
      const d = points[(j + 1) % count].position;
      const sx = d.x - c.x;
      const sz = d.z - c.z;
      const secondLength = Math.hypot(sx, sz);
      if (secondLength < 1e-3) continue;

      const closest = closestPointBetweenSegments(a, b, c, d);
      const crossingAngle = Math.asin(Math.min(1, Math.abs(cross(rx, rz, sx, sz)) / (firstLength * secondLength))) * (180 / Math.PI);
      const roadOverlapRange = Math.max(3, (points[i].width + points[j].width) / 2 - 1.5);
      if (closest.intersects ? crossingAngle < 16 : (closest.gap > roadOverlapRange || crossingAngle < 32)) continue;

      // Ignore adjacent bends and switchbacks close enough to be part of the same
      // continuous road section. Only grade-separate distinct route passages.
      const firstDistance = (i + closest.firstT) * sampleStep;
      const secondDistance = (j + closest.secondT) * sampleStep;
      const routeGap = Math.abs(distanceAlongTrack(firstDistance, secondDistance, trackLength, closed));
      if (routeGap < 80) continue;

      if (crossings.some((hit) => Math.hypot(hit.x - closest.x, hit.z - closest.z) < 12)) continue;
      crossings.push({
        x: closest.x,
        z: closest.z,
        firstIndex: i,
        firstT: closest.firstT,
        secondIndex: j,
        secondT: closest.secondT
      });
    }
  }

  return crossings;
}

function distanceAlongTrack(from: number, to: number, trackLength: number, closed: boolean): number {
  let distance = to - from;
  if (closed) {
    distance = ((distance + trackLength / 2) % trackLength + trackLength) % trackLength - trackLength / 2;
  }
  return distance;
}

/**
 * Detects both intersecting and road-width-overlapping passages, separates flat
 * crossings, marks the upper deck for a visible bridge structure, and covers
 * the lower road as an underpass. It also detects roads covered by local hills.
 */
export function addAutomaticGradeSeparation(points: SplinePoint[], closed = true): SplinePoint[] {
  if (points.length < 8) return points;

  const result = points.map((point) => ({ ...point, position: { ...point.position }, tunnel: false, bridge: false }));
  const sampleStep = result[result.length - 1].distance / Math.max(1, result.length - 1);
  const trackLength = closed ? result[result.length - 1].distance + sampleStep : result[result.length - 1].distance;
  const crossings = findCrossings(result, closed);

  for (const crossing of crossings) {
    const lowerDistance = (crossing.firstIndex + crossing.firstT) * sampleStep;
    const upperDistance = (crossing.secondIndex + crossing.secondT) * sampleStep;
    const firstY = result[crossing.firstIndex].position.y * (1 - crossing.firstT)
      + result[(crossing.firstIndex + 1) % result.length].position.y * crossing.firstT;
    const secondY = result[crossing.secondIndex].position.y * (1 - crossing.secondT)
      + result[(crossing.secondIndex + 1) % result.length].position.y * crossing.secondT;

    const elevationGap = Math.abs(firstY - secondY);
    const firstTurn = passageCurvature(result, crossing.firstIndex);
    const secondTurn = passageCurvature(result, crossing.secondIndex);
    // Preserve an obvious authored height order. For nearly level passages,
    // put the straighter, more bridge-friendly section on the upper deck.
    const firstIsBridge = elevationGap >= 3
      ? firstY > secondY
      : firstTurn < secondTurn - 1e-4;
    const firstIsLower = !firstIsBridge;
    const upperDistanceOnRoute = firstIsLower ? upperDistance : lowerDistance;
    const lowerDistanceOnRoute = firstIsLower ? lowerDistance : upperDistance;
    const upperY = firstIsLower ? secondY : firstY;
    const lowerY = firstIsLower ? firstY : secondY;
    const lift = Math.max(0, lowerY + 8 - upperY);

    for (let i = 0; i < result.length; i++) {
      const pointDistance = result[i].distance;
      const alongUpper = Math.abs(distanceAlongTrack(upperDistanceOnRoute, pointDistance, trackLength, closed));
      if (alongUpper <= 38) result[i].bridge = true;
      if (lift > 0 && alongUpper < 110) {
        const weight = alongUpper <= 24 ? 1 : 1 - smoothstep((alongUpper - 24) / 86);
        const offset = lift * weight;
        result[i].position.y += offset;
        result[i].elevation += offset;
      }

      const alongLower = Math.abs(distanceAlongTrack(lowerDistanceOnRoute, pointDistance, trackLength, closed));
      if (alongLower <= 30) result[i].tunnel = true;
    }
  }

  // Where the procedural landscape rises well above a road, create a short
  // covered section as a tunnel. Reject tiny fragments to avoid tunnel flicker.
  const covered = result.map((point) => getAmbientTerrainHeight(point.position.x, point.position.z) - point.position.y >= 6.5);
  const coveredRuns: number[][] = [];
  let run: number[] = [];
  for (let i = 0; i < covered.length * (closed ? 2 : 1); i++) {
    const index = i % covered.length;
    if (covered[index] && (closed || i < covered.length)) run.push(index);
    else if (run.length) {
      coveredRuns.push([...new Set(run)]);
      run = [];
    }
  }
  if (run.length) coveredRuns.push([...new Set(run)]);

  for (const coveredRun of coveredRuns) {
    const runLength = coveredRun.length * sampleStep;
    if (runLength >= 100) coveredRun.forEach((index) => { result[index].tunnel = true; });
  }

  return result;
}

function passageCurvature(points: SplinePoint[], index: number): number {
  const previous = points[(index - 1 + points.length) % points.length].tangent;
  const next = points[(index + 1) % points.length].tangent;
  const dot = previous.x * next.x + previous.y * next.y + previous.z * next.z;
  const previousLength = Math.hypot(previous.x, previous.y, previous.z) || 1;
  const nextLength = Math.hypot(next.x, next.y, next.z) || 1;
  return Math.acos(Math.max(-1, Math.min(1, dot / (previousLength * nextLength))));
}
