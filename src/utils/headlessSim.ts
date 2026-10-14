import { SplinePoint, TrackConfig } from '../types/track';
import { CAR_PRESETS, CarSpecs, DEFAULT_PLAYER_CAR_ID } from './carPresets';

export interface SimulatedTurn {
  cornerIndex: number;
  label: string;
  distance: number;
  apexSpeedKmh: number;
  radiusMeters: number;
  bankingDeg: number;
  elevationMeters: number;
  direction: 'left' | 'right';
}

export interface LapSimulationResult {
  estimatedLapTimeSeconds: number;
  formattedLapTime: string;
  topSpeedKmh: number;
  minSpeedKmh: number;
  avgSpeedKmh: number;
  totalLengthMeters: number;
  speedProfile: { distance: number; speedKmh: number; elevation: number; banking: number }[];
  turns: SimulatedTurn[];
  fiaGrade: {
    grade: 'Grade 1 (F1)' | 'Grade 2' | 'Grade 3' | 'Grade 4 / Club' | 'Karting';
    badgeColor: string;
    description: string;
    criteria: { name: string; passed: boolean; value: string; requirement: string }[];
  };
}

/**
 * Headless Fast Lap Time & Speed Profile Simulation
 * Integrates forward acceleration and backward braking limits along the spline.
 */
export function simulateCircuitLap(
  splinePoints: SplinePoint[],
  trackConfig: TrackConfig,
  carId: string = DEFAULT_PLAYER_CAR_ID
): LapSimulationResult {
  if (splinePoints.length < 10) {
    return {
      estimatedLapTimeSeconds: 0,
      formattedLapTime: '--:--.---',
      topSpeedKmh: 0,
      minSpeedKmh: 0,
      avgSpeedKmh: 0,
      totalLengthMeters: 0,
      speedProfile: [],
      turns: [],
      fiaGrade: {
        grade: 'Grade 4 / Club',
        badgeColor: '#F59E0B',
        description: 'Track too short for FIA homologation.',
        criteria: []
      }
    };
  }

  const specs: CarSpecs = CAR_PRESETS[carId] || CAR_PRESETS[DEFAULT_PLAYER_CAR_ID];
  const p = specs.physics;
  const n = splinePoints.length;

  // Compute segment lengths and cumulative distances
  const distances: number[] = new Array(n).fill(0);
  let totalLength = 0;
  for (let i = 0; i < n; i++) {
    distances[i] = totalLength;
    const nextIdx = (i + 1) % n;
    const dx = splinePoints[nextIdx].position.x - splinePoints[i].position.x;
    const dy = splinePoints[nextIdx].position.y - splinePoints[i].position.y;
    const dz = splinePoints[nextIdx].position.z - splinePoints[i].position.z;
    totalLength += Math.hypot(dx, dy, dz);
  }

  // 1. Calculate Maximum Cornering Speed at each point
  // v_corner = sqrt( mu * g * R / (1 - mu * tan(theta)) )
  const maxCornerSpeeds: number[] = new Array(n);
  const radii: number[] = new Array(n);
  const curvatures: number[] = new Array(n);

  const topSpeedMs = p.maxForwardSpeedMs || (specs.topSpeedKmh / 3.6);
  const gravity = 9.81;
  const mu = (p.gripMultiplier || 1.0) * 1.6; // Base friction coefficient

  for (let i = 0; i < n; i++) {
    const prev = splinePoints[(i - 1 + n) % n].position;
    const curr = splinePoints[i].position;
    const next = splinePoints[(i + 1) % n].position;

    // Approximate curvature from 3 consecutive points in XZ plane
    const v1x = curr.x - prev.x;
    const v1z = curr.z - prev.z;
    const v2x = next.x - curr.x;
    const v2z = next.z - curr.z;

    const cross = v1x * v2z - v1z * v2x;
    const l1 = Math.hypot(v1x, v1z);
    const l2 = Math.hypot(v2x, v2z);
    const chord = Math.hypot(next.x - prev.x, next.z - prev.z);

    const area2 = Math.abs(cross);
    const curvature = (2 * area2) / Math.max(0.001, l1 * l2 * chord);
    curvatures[i] = curvature;

    const radius = curvature > 0.0001 ? 1 / curvature : 9999;
    radii[i] = radius;

    // Banking contribution (theta in radians)
    const bankingRad = ((splinePoints[i].banking || 0) * Math.PI) / 180;
    const tanTheta = Math.tan(Math.max(-0.35, Math.min(0.45, bankingRad)));
    const denom = Math.max(0.2, 1 - mu * tanTheta);

    // Lateral grip cornering limit
    const vGrip = Math.sqrt((mu * gravity * radius) / denom);

    // Cap with car's theoretical top speed
    maxCornerSpeeds[i] = Math.min(topSpeedMs, isNaN(vGrip) ? topSpeedMs : vGrip);
  }

  // 2. Backward Pass: Enforce Braking Limits
  // v_i <= sqrt(v_{i+1}^2 + 2 * a_brake * ds)
  const brakeAcc = p.brakeDecel || 35.0; // m/s^2
  const vProfile: number[] = [...maxCornerSpeeds];

  for (let iter = 0; iter < 2; iter++) {
    for (let i = n - 1; i >= 0; i--) {
      const nextIdx = (i + 1) % n;
      const ds = distances[nextIdx] >= distances[i]
        ? distances[nextIdx] - distances[i]
        : (totalLength - distances[i]) + distances[nextIdx];
      const maxEntry = Math.sqrt(vProfile[nextIdx] * vProfile[nextIdx] + 2 * brakeAcc * Math.max(0.1, ds));
      if (maxEntry < vProfile[i]) {
        vProfile[i] = Math.max(10, maxEntry);
      }
    }
  }

  // 3. Forward Pass: Enforce Acceleration & Power Limits
  // v_{i+1} <= sqrt(v_i^2 + 2 * a_accel * ds)
  const maxAcc = p.maxDriveAccel || 25.0; // m/s^2
  for (let iter = 0; iter < 2; iter++) {
    for (let i = 0; i < n; i++) {
      const nextIdx = (i + 1) % n;
      const ds = distances[nextIdx] >= distances[i]
        ? distances[nextIdx] - distances[i]
        : (totalLength - distances[i]) + distances[nextIdx];

      // Acceleration falls off at high speeds due to aerodynamic drag
      const speedRatio = Math.min(1.0, vProfile[i] / topSpeedMs);
      const effectiveAcc = Math.max(4.0, maxAcc * (1 - Math.pow(speedRatio, 1.8)));

      const maxExit = Math.sqrt(vProfile[i] * vProfile[i] + 2 * effectiveAcc * Math.max(0.1, ds));
      if (maxExit < vProfile[nextIdx]) {
        vProfile[nextIdx] = maxExit;
      }
    }
  }

  // 4. Time Integration: dt = ds / v_avg
  let totalLapTimeSeconds = 0;
  let minSpeed = Infinity;
  let topSpeed = 0;

  for (let i = 0; i < n; i++) {
    const nextIdx = (i + 1) % n;
    const ds = distances[nextIdx] >= distances[i]
      ? distances[nextIdx] - distances[i]
      : (totalLength - distances[i]) + distances[nextIdx];

    const vAvg = Math.max(5.0, (vProfile[i] + vProfile[nextIdx]) / 2);
    totalLapTimeSeconds += ds / vAvg;

    if (vProfile[i] < minSpeed) minSpeed = vProfile[i];
    if (vProfile[i] > topSpeed) topSpeed = vProfile[i];
  }

  const avgSpeedMs = totalLapTimeSeconds > 0 ? totalLength / totalLapTimeSeconds : 0;

  // Speed profile data for elevation/speed chart
  const speedProfile = splinePoints.map((pt, idx) => ({
    distance: Math.round(distances[idx]),
    speedKmh: Math.round(vProfile[idx] * 3.6),
    elevation: Number((pt.elevation || 0).toFixed(1)),
    banking: Number((pt.banking || 0).toFixed(1))
  }));

  // 5. Detect Distinct Turns / Apexes
  const turns: SimulatedTurn[] = [];
  let turnNumber = 1;
  const minTurnSeparationMeters = 70;
  let lastTurnDistance = -minTurnSeparationMeters;

  for (let i = 2; i < n - 2; i++) {
    const dist = distances[i];
    // Check if local curvature is high and local speed minimum
    if (radii[i] < 350 && vProfile[i] < vProfile[i - 1] && vProfile[i] <= vProfile[i + 1]) {
      if (dist - lastTurnDistance >= minTurnSeparationMeters) {
        // Determine direction via 2D cross product
        const prev = splinePoints[(i - 2 + n) % n].position;
        const curr = splinePoints[i].position;
        const next = splinePoints[(i + 2) % n].position;
        const cross = (curr.x - prev.x) * (next.z - curr.z) - (curr.z - prev.z) * (next.x - curr.x);
        const direction: 'left' | 'right' = cross > 0 ? 'left' : 'right';

        turns.push({
          cornerIndex: i,
          label: `T${turnNumber++}`,
          distance: Math.round(dist),
          apexSpeedKmh: Math.round(vProfile[i] * 3.6),
          radiusMeters: Math.round(radii[i]),
          bankingDeg: Number((splinePoints[i].banking || 0).toFixed(1)),
          elevationMeters: Number((splinePoints[i].elevation || 0).toFixed(1)),
          direction
        });
        lastTurnDistance = dist;
      }
    }
  }

  // 6. FIA Homologation Grade Assessment
  const minWidth = Math.min(...trackConfig.nodes.map(node => node.width || trackConfig.defaultWidth));
  const avgWidth = trackConfig.nodes.reduce((acc, node) => acc + (node.width || trackConfig.defaultWidth), 0) / Math.max(1, trackConfig.nodes.length);
  const minRunoff = Math.min(...trackConfig.nodes.map(node => node.runoffWidth ?? 8.5));

  const criteria = [
    {
      name: 'Circuit Length',
      passed: totalLength >= 3500,
      value: `${(totalLength / 1000).toFixed(2)} km`,
      requirement: '≥ 3.50 km (FIA Grade 1)'
    },
    {
      name: 'Minimum Track Width',
      passed: minWidth >= 12.0,
      value: `${minWidth.toFixed(1)} m`,
      requirement: '≥ 12.0 m'
    },
    {
      name: 'Average Track Width',
      passed: avgWidth >= 13.0,
      value: `${avgWidth.toFixed(1)} m`,
      requirement: '≥ 13.0 m recommended'
    },
    {
      name: 'Run-Off Safety Margins',
      passed: minRunoff >= 8.0,
      value: `${minRunoff.toFixed(1)} m`,
      requirement: '≥ 8.0 m at critical zones'
    },
    {
      name: 'Circuit Closure',
      passed: trackConfig.isClosed,
      value: trackConfig.isClosed ? 'Closed Loop' : 'Point-to-Point',
      requirement: 'Closed Circuit'
    }
  ];

  let grade: 'Grade 1 (F1)' | 'Grade 2' | 'Grade 3' | 'Grade 4 / Club' | 'Karting';
  let badgeColor: string;
  let description: string;

  if (totalLength < 1800) {
    grade = 'Karting';
    badgeColor = '#3B82F6';
    description = 'Compact technical course, ideal for Karting, Formule Renault, and junior series.';
  } else if (totalLength >= 3500 && minWidth >= 12.0 && trackConfig.isClosed && minRunoff >= 6.0) {
    grade = 'Grade 1 (F1)';
    badgeColor = '#EF4444';
    description = 'Full FIA Grade 1 compliance. Certified for Formula 1 Grand Prix World Championship.';
  } else if (totalLength >= 3000 && minWidth >= 10.0 && trackConfig.isClosed) {
    grade = 'Grade 2';
    badgeColor = '#10B981';
    description = 'FIA Grade 2 compliance. Eligible for FIA WEC, Formula 2, IndyCar, and GT3.';
  } else if (totalLength >= 2200 && minWidth >= 9.0) {
    grade = 'Grade 3';
    badgeColor = '#F59E0B';
    description = 'FIA Grade 3 compliance. Suitable for Formula 3, TCR, and national championships.';
  } else {
    grade = 'Grade 4 / Club';
    badgeColor = '#8B5CF6';
    description = 'Club circuit specification for regional track days and historic racing.';
  }

  // Format lap time into MM:SS.mmm
  const minutes = Math.floor(totalLapTimeSeconds / 60);
  const remainingSeconds = totalLapTimeSeconds % 60;
  const formattedSeconds = remainingSeconds.toFixed(3).padStart(6, '0');
  const formattedLapTime = `${minutes}:${formattedSeconds}`;

  return {
    estimatedLapTimeSeconds: totalLapTimeSeconds,
    formattedLapTime,
    topSpeedKmh: Math.round(topSpeed * 3.6),
    minSpeedKmh: Math.round(minSpeed * 3.6),
    avgSpeedKmh: Math.round(avgSpeedMs * 3.6),
    totalLengthMeters: Math.round(totalLength),
    speedProfile,
    turns,
    fiaGrade: {
      grade,
      badgeColor,
      description,
      criteria
    }
  };
}
