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

const cross = (ax: number, az: number, bx: number, bz: number) => ax * bz - az * bx;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

function findCrossings(points: SplinePoint[], closed: boolean): Crossing[] {
  const count = points.length;
  const crossings: Crossing[] = [];
  const segmentCount = closed ? count : count - 1;

  for (let i = 0; i < segmentCount; i++) {
    const a = points[i].position;
    const b = points[(i + 1) % count].position;
    const rx = b.x - a.x;
    const rz = b.z - a.z;

    for (let j = i + 3; j < segmentCount; j++) {
      if (closed && i === 0 && j >= count - 2) continue;
      const c = points[j].position;
      const d = points[(j + 1) % count].position;
      const sx = d.x - c.x;
      const sz = d.z - c.z;
      const denominator = cross(rx, rz, sx, sz);
      if (Math.abs(denominator) < 1e-6) continue;

      const cax = c.x - a.x;
      const caz = c.z - a.z;
      const t = cross(cax, caz, sx, sz) / denominator;
      const u = cross(cax, caz, rx, rz) / denominator;
      if (t <= 0.04 || t >= 0.96 || u <= 0.04 || u >= 0.96) continue;

      const x = a.x + rx * t;
      const z = a.z + rz * t;
      if (crossings.some((hit) => Math.hypot(hit.x - x, hit.z - z) < 20)) continue;
      crossings.push({ x, z, firstIndex: i, firstT: t, secondIndex: j, secondT: u });
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
 * Adds automatic grade separation to flat self-crossings and marks their lower
 * passage as a tunnel. It also marks sufficiently covered sections as hill tunnels.
 */
export function addAutomaticGradeSeparation(points: SplinePoint[], closed = true): SplinePoint[] {
  if (points.length < 8) return points;

  const result = points.map((point) => ({ ...point, position: { ...point.position }, tunnel: false }));
  const lastPoint = result[result.length - 1];
  const sampleStep = lastPoint.distance / Math.max(1, result.length - 1);
  const trackLength = closed ? lastPoint.distance + sampleStep : lastPoint.distance;
  const crossings = findCrossings(result, closed);

  for (const crossing of crossings) {
    const lowerDistance = (crossing.firstIndex + crossing.firstT) * sampleStep;
    const upperDistance = (crossing.secondIndex + crossing.secondT) * sampleStep;
    const firstY = result[crossing.firstIndex].position.y * (1 - crossing.firstT)
      + result[(crossing.firstIndex + 1) % result.length].position.y * crossing.firstT;
    const secondY = result[crossing.secondIndex].position.y * (1 - crossing.secondT)
      + result[(crossing.secondIndex + 1) % result.length].position.y * crossing.secondT;

    const firstIsLower = firstY <= secondY;
    const upperDistanceOnRoute = firstIsLower ? upperDistance : lowerDistance;
    const lowerDistanceOnRoute = firstIsLower ? lowerDistance : upperDistance;
    const upperY = firstIsLower ? secondY : firstY;
    const lowerY = Math.min(firstY, secondY);
    const lift = Math.max(0, lowerY + 8 - upperY);

    for (let i = 0; i < result.length; i++) {
      const pointDistance = result[i].distance;
      const along = Math.abs(distanceAlongTrack(upperDistanceOnRoute, pointDistance, trackLength, closed));
      if (lift > 0 && along < 110) {
        const weight = along <= 24 ? 1 : 1 - smoothstep((along - 24) / 86);
        const offset = lift * weight;
        result[i].position.y += offset;
        result[i].elevation += offset;
      }

      const underpassDistance = Math.abs(distanceAlongTrack(lowerDistanceOnRoute, pointDistance, trackLength, closed));
      if (underpassDistance <= 28) result[i].tunnel = true;
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
