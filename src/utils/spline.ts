import * as THREE from 'three';
import { TrackNode, SplinePoint, Vector3D } from '../types/track';

/**
 * Builds a THREE.CatmullRomCurve3 from track nodes with elevation
 */
export function buildTrackCurve(nodes: TrackNode[], isClosed: boolean = true): THREE.CatmullRomCurve3 | null {
  if (nodes.length < 2) {
    return null;
  }

  const points = nodes.map(node => new THREE.Vector3(node.x, node.elevation || 0, node.y));
  return new THREE.CatmullRomCurve3(points, isClosed, 'catmullrom', 0.5);
}

/**
 * Samples spline points along the circuit curve with width, tangents, and normals
 */
export function sampleSplinePoints(
  curve: THREE.CatmullRomCurve3 | null,
  nodes: TrackNode[],
  divisions: number = 350
): SplinePoint[] {
  if (!curve || nodes.length < 2) return [];

  const points: SplinePoint[] = [];
  const totalLength = curve.getLength();
  const nodeCount = nodes.length;

  for (let i = 0; i < divisions; i++) {
    const t = i / divisions;
    const position = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();

    const up = new THREE.Vector3(0, 1, 0);
    const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

    let nodeIndex = t * nodeCount;
    let idx1 = Math.floor(nodeIndex) % nodeCount;
    let idx2 = (idx1 + 1) % nodeCount;
    let factor = nodeIndex - Math.floor(nodeIndex);

    const n1 = nodes[idx1] || nodes[0];
    const n2 = nodes[idx2] || nodes[0];

    const width = n1.width + (n2.width - n1.width) * factor;
    const elevation = n1.elevation + (n2.elevation - n1.elevation) * factor;

    points.push({
      position: { x: position.x, y: position.y, z: position.z },
      tangent: { x: tangent.x, y: tangent.y, z: tangent.z },
      normal: { x: normal.x, y: normal.y, z: normal.z },
      binormal: { x: binormal.x, y: binormal.y, z: binormal.z },
      width,
      elevation,
      t,
      distance: t * totalLength
    });
  }

  return points;
}

/**
 * Single Authoritative Function to calculate vehicle spawn position and yaw orientation
 */
export function getTrackSpawnTransform(splinePoints: SplinePoint[]): {
  position: Vector3D;
  rotation: Vector3D;
  forward: Vector3D;
} {
  if (splinePoints.length < 2) {
    return {
      position: { x: 0, y: 0.10, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      forward: { x: 0, y: 0, z: 1 }
    };
  }

  const p0 = splinePoints[0];
  const p1 = splinePoints[1] || splinePoints[0];

  const dx = p1.position.x - p0.position.x;
  const dz = p1.position.z - p0.position.z;
  const len = Math.sqrt(dx * dx + dz * dz) || 1;

  const forward = { x: dx / len, y: 0, z: dz / len };
  const yaw = Math.atan2(forward.x, forward.z);

  return {
    position: { x: p0.position.x, y: p0.position.y + 0.10, z: p0.position.z },
    rotation: { x: 0, y: yaw, z: 0 },
    forward
  };
}

/**
 * Calculates estimated lap time (in seconds) based on track geometry
 */
export function estimateLapTime(lengthMeters: number, nodeCount: number): number {
  if (lengthMeters <= 0 || nodeCount < 2) return 0;
  const avgSpeedMs = Math.max(30, 60 - (nodeCount * 0.5));
  return Math.round((lengthMeters / avgSpeedMs) * 100) / 100;
}

/**
 * Distance between car position and nearest point on spline using exact segment projection
 */
export function getNearestSplinePoint(
  carPos: { x: number; y: number; z: number },
  splinePoints: SplinePoint[]
): {
  point: SplinePoint | null;
  distance: number;
  trackOffset: number;
  nearestIndex: number;
  segmentT: number;
} {
  const n = splinePoints.length;
  if (n === 0) {
    return { point: null, distance: 0, trackOffset: 0, nearestIndex: 0, segmentT: 0 };
  }

  let minDistanceSq = Infinity;
  let bestIndex = 0;
  let bestProjX = splinePoints[0].position.x;
  let bestProjZ = splinePoints[0].position.z;

  // Project carPos onto each spline segment [P_i, P_{i+1}]
  for (let i = 0; i < n; i++) {
    const p1 = splinePoints[i].position;
    const p2 = splinePoints[(i + 1) % n].position;

    const segX = p2.x - p1.x;
    const segZ = p2.z - p1.z;
    const segLenSq = segX * segX + segZ * segZ;

    let t = 0;
    if (segLenSq > 0.0001) {
      t = ((carPos.x - p1.x) * segX + (carPos.z - p1.z) * segZ) / segLenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const projX = p1.x + t * segX;
    const projZ = p1.z + t * segZ;

    const dx = carPos.x - projX;
    const dz = carPos.z - projZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      bestIndex = i;
      bestProjX = projX;
      bestProjZ = projZ;
    }
  }

  const nearestPoint = splinePoints[bestIndex];
  const distance = Math.sqrt(minDistanceSq);

  // Signed track offset: determine which side of the track the car is on
  const pNext = splinePoints[(bestIndex + 1) % n].position;
  const tanX = pNext.x - nearestPoint.position.x;
  const tanZ = pNext.z - nearestPoint.position.z;
  const toCarX = carPos.x - bestProjX;
  const toCarZ = carPos.z - bestProjZ;

  // 2D cross product: tanX * toCarZ - tanZ * toCarX
  const side = Math.sign(tanX * toCarZ - tanZ * toCarX);
  const trackOffset = distance * (side || 1);

  return {
    point: nearestPoint,
    distance,
    trackOffset,
    nearestIndex: bestIndex,
    segmentT: bestIndex / n
  };
}

/**
 * Mathematically detects whether the vehicle trajectory [prevPos -> currPos]
 * intersected the Start/Finish Line gate in the forward direction.
 */
export function checkFinishLineCrossing(
  prevPos: { x: number; z: number },
  currPos: { x: number; z: number },
  startPoint: SplinePoint
): boolean {
  if (!startPoint) return false;

  const halfWidth = (startPoint.width / 2) + 3.0; // covers full road, kerbs and runoff
  const p0 = startPoint.position;
  const bin = startPoint.binormal;
  const tan = startPoint.tangent;

  // Gate endpoints along binormal (perpendicular to road)
  const g1x = p0.x - bin.x * halfWidth;
  const g1z = p0.z - bin.z * halfWidth;
  const g2x = p0.x + bin.x * halfWidth;
  const g2z = p0.z + bin.z * halfWidth;

  const c1x = prevPos.x;
  const c1z = prevPos.z;
  const c2x = currPos.x;
  const c2z = currPos.z;

  const d1x = c2x - c1x;
  const d1z = c2z - c1z;
  const d2x = g2x - g1x;
  const d2z = g2z - g1z;

  const det = d1x * d2z - d1z * d2x;
  if (Math.abs(det) < 1e-6) return false;

  const deltaX = g1x - c1x;
  const deltaZ = g1z - c1z;

  const u = (deltaX * d2z - deltaZ * d2x) / det;
  const v = (deltaX * d1z - deltaZ * d1x) / det;

  // Check if car trajectory crossed between gate endpoints
  if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
    // Check motion is in forward direction across the finish plane
    const dot = d1x * tan.x + d1z * tan.z;
    return dot > -0.2;
  }

  return false;
}

