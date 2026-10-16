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

    const width = (n1.width ?? 14) + ((n2.width ?? 14) - (n1.width ?? 14)) * factor;
    const elevation = (n1.elevation ?? 0) + ((n2.elevation ?? 0) - (n1.elevation ?? 0)) * factor;
    const banking = (n1.banking ?? 0) + ((n2.banking ?? 0) - (n1.banking ?? 0)) * factor;
    const runoffWidth = (n1.runoffWidth ?? 8.5) + ((n2.runoffWidth ?? 8.5) - (n1.runoffWidth ?? 8.5)) * factor;

    points.push({
      position: { x: position.x, y: position.y, z: position.z },
      tangent: { x: tangent.x, y: tangent.y, z: tangent.z },
      normal: { x: normal.x, y: normal.y, z: normal.z },
      binormal: { x: binormal.x, y: binormal.y, z: binormal.z },
      width,
      elevation,
      banking,
      runoffWidth,
      t,
      distance: t * totalLength
    });
  }

  return points;
}

/**
 * Single Authoritative Function to calculate vehicle spawn position and yaw orientation
 * Phase 6: P0 = splinePoints[0], P1 = next meaningful spline sample,
 * trackForward = normalize(P1 - P0), physicsYaw = Math.atan2(trackForward.x, trackForward.z)
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
  // Sample a clear forward step (e.g. 1st or 2nd point) to avoid micro-tangent noise
  const sampleIdx = Math.min(2, splinePoints.length - 1);
  const p1 = splinePoints[sampleIdx];

  const dx = p1.position.x - p0.position.x;
  const dz = p1.position.z - p0.position.z;
  const len = Math.hypot(dx, dz) || 1;
  const trackForward: Vector3D = { x: dx / len, y: 0, z: dz / len };

  const bankRad = (p0.banking || 0) * (Math.PI / 180);
  const cosBank = Math.cos(bankRad);
  const sinBank = Math.sin(bankRad);

  const bUpX = -p0.binormal.x * sinBank + p0.normal.x * cosBank;
  const bUpY = -p0.binormal.y * sinBank + p0.normal.y * cosBank;
  const bUpZ = -p0.binormal.z * sinBank + p0.normal.z * cosBank;

  const fDotUp = trackForward.x * bUpX + trackForward.z * bUpZ;
  let fX = trackForward.x - bUpX * fDotUp;
  let fY = -bUpY * fDotUp;
  let fZ = trackForward.z - bUpZ * fDotUp;
  const fLen = Math.hypot(fX, fY, fZ) || 1;
  fX /= fLen;
  fY /= fLen;
  fZ /= fLen;

  const rX = bUpY * fZ - bUpZ * fY;
  const rY = bUpZ * fX - bUpX * fZ;
  const rZ = bUpX * fY - bUpY * fX;

  const rotMat = new THREE.Matrix4().set(
    rX, bUpX, fX, 0,
    rY, bUpY, fY, 0,
    rZ, bUpZ, fZ, 0,
    0, 0, 0, 1
  );
  const euler = new THREE.Euler().setFromRotationMatrix(rotMat, 'YXZ');

  return {
    position: {
      x: p0.position.x + bUpX * 0.14,
      y: p0.position.y + bUpY * 0.14,
      z: p0.position.z + bUpZ * 0.14
    },
    rotation: { x: euler.x, y: euler.y, z: euler.z },
    forward: trackForward
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
 * Distance between car position and nearest point on spline using continuous 3D segment projection
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
  let bestT = 0;
  let bestProjX = splinePoints[0].position.x;
  let bestProjY = splinePoints[0].position.y;
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
    const projY = p1.y + t * (p2.y - p1.y);
    const projZ = p1.z + t * segZ;

    const dx = carPos.x - projX;
    const dz = carPos.z - projZ;
    // Include vertical distance weighting so overpasses/crossovers don't latch onto lower/upper track
    const dy = carPos.y !== undefined ? (carPos.y - projY) : 0;
    const distSq = dx * dx + dz * dz + dy * dy * 0.45;

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      bestIndex = i;
      bestT = t;
      bestProjX = projX;
      bestProjY = projY;
      bestProjZ = projZ;
    }
  }

  const sp1 = splinePoints[bestIndex];
  const sp2 = splinePoints[(bestIndex + 1) % n];

  // Continuous interpolation of tangent, binormal, and normal unit vectors
  const tanX = sp1.tangent.x + bestT * (sp2.tangent.x - sp1.tangent.x);
  const tanY = sp1.tangent.y + bestT * (sp2.tangent.y - sp1.tangent.y);
  const tanZ = sp1.tangent.z + bestT * (sp2.tangent.z - sp1.tangent.z);
  const tanLen = Math.hypot(tanX, tanY, tanZ) || 1;

  const binX = sp1.binormal.x + bestT * (sp2.binormal.x - sp1.binormal.x);
  const binY = sp1.binormal.y + bestT * (sp2.binormal.y - sp1.binormal.y);
  const binZ = sp1.binormal.z + bestT * (sp2.binormal.z - sp1.binormal.z);
  const binLen = Math.hypot(binX, binY, binZ) || 1;

  const normX = sp1.normal.x + bestT * (sp2.normal.x - sp1.normal.x);
  const normY = sp1.normal.y + bestT * (sp2.normal.y - sp1.normal.y);
  const normZ = sp1.normal.z + bestT * (sp2.normal.z - sp1.normal.z);
  const normLen = Math.hypot(normX, normY, normZ) || 1;

  const interpPoint: SplinePoint = {
    position: { x: bestProjX, y: bestProjY, z: bestProjZ },
    tangent: { x: tanX / tanLen, y: tanY / tanLen, z: tanZ / tanLen },
    binormal: { x: binX / binLen, y: binY / binLen, z: binZ / binLen },
    normal: { x: normX / normLen, y: normY / normLen, z: normZ / normLen },
    width: sp1.width + bestT * (sp2.width - sp1.width),
    banking: sp1.banking + bestT * (sp2.banking - sp1.banking),
    elevation: sp1.elevation + bestT * (sp2.elevation - sp1.elevation),
    distance: sp1.distance + bestT * (sp2.distance >= sp1.distance ? (sp2.distance - sp1.distance) : 10),
    runoffWidth: (sp1.runoffWidth ?? 8.5) + bestT * ((sp2.runoffWidth ?? 8.5) - (sp1.runoffWidth ?? 8.5)),
    t: (bestIndex + bestT) / n
  };

  const horizDist = Math.hypot(carPos.x - bestProjX, carPos.z - bestProjZ);

  // Signed lateral track offset based on interpolated binormal
  const toCarX = carPos.x - bestProjX;
  const toCarZ = carPos.z - bestProjZ;
  const side = Math.sign(interpPoint.binormal.x * toCarX + interpPoint.binormal.z * toCarZ);
  const trackOffset = horizDist * (side || 1);

  return {
    point: interpPoint,
    distance: horizDist,
    trackOffset,
    nearestIndex: bestIndex,
    segmentT: (bestIndex + bestT) / n
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

