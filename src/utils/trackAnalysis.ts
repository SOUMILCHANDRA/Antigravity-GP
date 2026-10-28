import { TrackConfig, TrackNode, SplinePoint } from '../types/track';

export interface CornerInfo {
  index: number;              // 1-based index (e.g. Turn 1)
  nodeId: string;
  name: string;               // e.g. "Turn 1", "T1" or custom name
  nodeIndex: number;          // index in track.nodes
  splineIndex: number;        // nearest index in sampled spline
  radius: number;             // radius in meters
  direction: 'left' | 'right';
  banking: number;            // in degrees
  elevation: number;          // in meters
  width: number;              // in meters
  runoffWidth: number;        // in meters
  isPinned: boolean;          // locked against auto-renaming / repositioning
}

export interface TrackStats {
  lengthMeters: number;
  longestStraightMeters: number;
  tightestRadiusMeters: number;
  elevationDeltaMeters: number;
  minElevationMeters: number;
  maxElevationMeters: number;
  cornerCount: number;
  corners: CornerInfo[];
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
  nodeIndex?: number;
  nodeId?: string;
}

/**
 * Computes circumcircle radius for 3 2D points (x, z)
 */
function compute2DCurvatureRadius(
  p1: { x: number; z: number },
  p2: { x: number; z: number },
  p3: { x: number; z: number }
): { radius: number; direction: 'left' | 'right' } {
  const a = Math.hypot(p2.x - p1.x, p2.z - p1.z);
  const b = Math.hypot(p3.x - p2.x, p3.z - p2.z);
  const c = Math.hypot(p1.x - p3.x, p1.z - p3.z);
  const cross = (p2.x - p1.x) * (p3.z - p1.z) - (p2.z - p1.z) * (p3.x - p1.x);
  const area = 0.5 * Math.abs(cross);

  const direction: 'left' | 'right' = cross > 0 ? 'right' : 'left';
  if (area < 1e-4) return { radius: 9999, direction };
  const radius = Math.max(5, Math.min(9999, (a * b * c) / (4 * area)));
  return { radius, direction };
}

/**
 * Detects corners along the track based on spline curvature and control node mapping
 */
export function detectTrackCorners(track: TrackConfig, splinePoints: SplinePoint[]): CornerInfo[] {
  if (track.nodes.length < 3 || splinePoints.length < 10) return [];

  const n = track.nodes.length;
  const corners: CornerInfo[] = [];
  let cornerCounter = 1;

  for (let i = 0; i < n; i++) {
    const node = track.nodes[i];
    const prevNode = track.nodes[(i - 1 + n) % n];
    const nextNode = track.nodes[(i + 1) % n];

    // Compute curvature radius at this node
    const { radius, direction } = compute2DCurvatureRadius(
      { x: prevNode.x, z: prevNode.y },
      { x: node.x, z: node.y },
      { x: nextNode.x, z: nextNode.y }
    );

    // If radius is less than 320m, classify as a corner/bend
    if (radius < 320) {
      // Find nearest spline index
      let nearestSplineIdx = 0;
      let minDistSq = Infinity;
      splinePoints.forEach((sp, sIdx) => {
        const dSq = (sp.position.x - node.x) ** 2 + (sp.position.z - node.y) ** 2;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          nearestSplineIdx = sIdx;
        }
      });

      const cornerName = node.cornerName || `Turn ${cornerCounter}`;

      corners.push({
        index: cornerCounter,
        nodeId: node.id,
        name: cornerName,
        nodeIndex: i,
        splineIndex: nearestSplineIdx,
        radius: Math.round(radius),
        direction,
        banking: node.banking ?? 0,
        elevation: node.elevation ?? 0,
        width: node.width ?? track.defaultWidth,
        runoffWidth: node.runoffWidth ?? 8.5,
        isPinned: !!node.locked
      });

      cornerCounter++;
    }
  }

  return corners;
}

/**
 * Calculates complete circuit telemetry statistics:
 * Length, longest straight, tightest corner, elevation delta, corner count
 */
export function calculateTrackStats(track: TrackConfig, splinePoints: SplinePoint[]): TrackStats {
  const corners = detectTrackCorners(track, splinePoints);

  if (splinePoints.length < 2) {
    return {
      lengthMeters: 0,
      longestStraightMeters: 0,
      tightestRadiusMeters: 0,
      elevationDeltaMeters: 0,
      minElevationMeters: 0,
      maxElevationMeters: 0,
      cornerCount: 0,
      corners: []
    };
  }

  const lengthMeters = Math.round(splinePoints[splinePoints.length - 1].distance);

  // Elevation extremes
  let minElev = Infinity;
  let maxElev = -Infinity;
  splinePoints.forEach(p => {
    minElev = Math.min(minElev, p.position.y);
    maxElev = Math.max(maxElev, p.position.y);
  });
  const elevationDeltaMeters = Math.round((maxElev - minElev) * 10) / 10;

  // Tightest radius
  let tightestRadiusMeters = 9999;
  corners.forEach(c => {
    tightestRadiusMeters = Math.min(tightestRadiusMeters, c.radius);
  });
  if (tightestRadiusMeters === 9999) tightestRadiusMeters = 0;

  // Longest straight calculation: scan distances between corners
  let longestStraightMeters = 0;
  if (corners.length >= 2) {
    for (let i = 0; i < corners.length; i++) {
      const c1 = corners[i];
      const c2 = corners[(i + 1) % corners.length];
      const d1 = splinePoints[c1.splineIndex]?.distance || 0;
      const d2 = splinePoints[c2.splineIndex]?.distance || 0;
      let straightDist = d2 >= d1 ? d2 - d1 : (lengthMeters - d1) + d2;
      longestStraightMeters = Math.max(longestStraightMeters, straightDist);
    }
  } else if (lengthMeters > 0) {
    longestStraightMeters = lengthMeters;
  }

  return {
    lengthMeters,
    longestStraightMeters: Math.round(longestStraightMeters),
    tightestRadiusMeters,
    elevationDeltaMeters,
    minElevationMeters: Math.round(minElev * 10) / 10,
    maxElevationMeters: Math.round(maxElev * 10) / 10,
    cornerCount: corners.length,
    corners
  };
}

/**
 * Screens circuit geometry with simple design heuristics:
 * - Warns on tight radius (< 15m)
 * - Warns on steep gradients (> 12%)
 * - Warns on self-intersection
 */
export function validateTrackGeometry(track: TrackConfig, splinePoints: SplinePoint[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodes = track.nodes;
  const n = nodes.length;

  if (n < 3 && track.isClosed) {
    issues.push({
      type: 'error',
      message: 'Circuit must have at least 3 control points to form a closed racing loop.'
    });
  }

  // 1. Gradient check between adjacent nodes
  for (let i = 0; i < n; i++) {
    const n1 = nodes[i];
    const n2 = nodes[(i + 1) % n];
    if (!track.isClosed && i === n - 1) break;

    const horizDist = Math.hypot(n2.x - n1.x, n2.y - n1.y);
    const vertDist = Math.abs((n2.elevation ?? 0) - (n1.elevation ?? 0));
    if (horizDist > 1) {
      const gradient = (vertDist / horizDist) * 100;
      if (gradient > 12) {
        issues.push({
          type: 'warning',
          message: `Steep gradient of ${gradient.toFixed(1)}% between points ${i + 1} and ${((i + 1) % n) + 1} (screening threshold: 12%).`,
          nodeIndex: i,
          nodeId: n1.id
        });
      }
    }
  }

  // 2. Corner radius check
  const corners = detectTrackCorners(track, splinePoints);
  corners.forEach(c => {
    if (c.radius < 15) {
      issues.push({
        type: 'warning',
      message: `${c.name} has a tight estimated radius of ${c.radius}m (screening threshold: 15m).`,
        nodeIndex: c.nodeIndex,
        nodeId: c.nodeId
      });
    }
  });

  // 3. 2D Self-intersection check (excluding consecutive segments)
  if (n >= 4) {
    const maxI = track.isClosed ? n : n - 1;
    const maxJ = track.isClosed ? n : n - 1;

    for (let i = 0; i < maxI; i++) {
      const p1 = nodes[i];
      const p2 = nodes[(i + 1) % n];

      for (let j = i + 2; j < maxJ; j++) {
        // Skip wrap-around adjacent segments
        if (track.isClosed && i === 0 && j === n - 1) continue;

        const p3 = nodes[j];
        const p4 = nodes[(j + 1) % n];

        if (checkLineSegmentsIntersect(p1, p2, p3, p4)) {
          issues.push({
            type: 'warning',
            message: `Track self-intersects between segments [${i + 1}-${((i + 1) % n) + 1}] and [${j + 1}-${((j + 1) % n) + 1}]. Race view automatically separates this crossing with an overpass and underpass tunnel.`,
            nodeIndex: i,
            nodeId: p1.id
          });
          break;
        }
      }
    }
  }

  return issues;
}

function checkLineSegmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): boolean {
  const ccw = (A: { x: number; y: number }, B: { x: number; y: number }, C: { x: number; y: number }) => {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  };
  return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}
