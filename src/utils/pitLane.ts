import { PitLaneConfig, SplinePoint, TrackConfig } from '../types/track';

/** Use the longest low-curvature part of a closed lap as a sensible default pit straight. */
export function resolvePitLaneConfig(track: TrackConfig, points: SplinePoint[]): PitLaneConfig | undefined {
  if (track.pitLane) return track.pitLane;
  if (!track.isClosed || points.length < 40) return undefined;

  const count = points.length;
  const windowRadius = Math.max(3, Math.floor(count * 0.025));
  let bestIndex = 0;
  let bestCurvature = Infinity;

  for (let index = 0; index < count; index++) {
    let curvature = 0;
    for (let offset = -windowRadius; offset < windowRadius; offset++) {
      const a = points[(index + offset + count) % count].tangent;
      const b = points[(index + offset + 1 + count) % count].tangent;
      const dot = a.x * b.x + a.y * b.y + a.z * b.z;
      curvature += Math.acos(Math.max(-1, Math.min(1, dot)));
    }
    if (curvature < bestCurvature) {
      bestCurvature = curvature;
      bestIndex = index;
    }
  }

  const span = Math.max(8, Math.floor(count * 0.04));
  return {
    enabled: true,
    entryT: ((bestIndex - span + count) % count) / count,
    exitT: ((bestIndex + span) % count) / count,
    speedLimitKmh: 80,
    pitBoxes: 10,
    side: 'right',
    width: 7.5
  };
}
