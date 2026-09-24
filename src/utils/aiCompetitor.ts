import { AICompetitorState, CarState, LapTelemetry, RaceBattleState, SplinePoint, Vector3D } from '../types/track';
import { getNearestSplinePoint, checkFinishLineCrossing } from './spline';
import { RacingLinePoint } from './racingLine';

export const INITIAL_AI_TELEMETRY: LapTelemetry = {
  currentLapTime: 0,
  lastLapTime: null,
  bestLapTime: null,
  completedLaps: 0,
  maxSpeedKmh: 0,
  lapValid: true
};

/**
 * Creates or resets the AI Competitor state at Starting Grid Slot 2 (staggered behind pole).
 */
export function createAICompetitor(splinePoints: SplinePoint[]): AICompetitorState {
  if (splinePoints.length < 2) {
    return {
      position: { x: 0, y: 0.1, z: -8.5 },
      rotation: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      speedKmh: 0,
      throttle: 0,
      brake: 0,
      steering: 0,
      offTrack: false,
      skidding: false,
      name: 'APEX AI #02',
      color: '#00E5FF',
      targetSpeedKmh: 0,
      lapTelemetry: { ...INITIAL_AI_TELEMETRY },
      hasStartedRace: false
    };
  }

  const p0 = splinePoints[0];
  const p1 = splinePoints[1];

  const dx = p1.position.x - p0.position.x;
  const dz = p1.position.z - p0.position.z;
  const len = Math.hypot(dx, dz) || 1;
  const forward = { x: dx / len, z: dz / len };
  const yaw = Math.atan2(forward.x, forward.z);

  // Lateral binormal in X-Z plane: (-forward.z, 0, forward.x)
  const binormal = { x: -forward.z, z: forward.x };

  // Slot 2: 8.5m behind player along track tangent, offset 2.2m to the right side of the track
  const spawnX = p0.position.x - forward.x * 8.5 + binormal.x * 2.2;
  const spawnY = p0.position.y + 0.10;
  const spawnZ = p0.position.z - forward.z * 8.5 + binormal.z * 2.2;

  return {
    position: { x: spawnX, y: spawnY, z: spawnZ },
    rotation: { x: 0, y: yaw, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    speedKmh: 0,
    throttle: 0,
    brake: 0,
    steering: 0,
    offTrack: false,
    skidding: false,
    name: 'APEX AI #02',
    color: '#00E5FF',
    targetSpeedKmh: 0,
    lapTelemetry: { ...INITIAL_AI_TELEMETRY },
    hasStartedRace: false
  };
}

/**
 * Normalizes an angle into [-PI, PI] range
 */
function normalizeAngle(rad: number): number {
  while (rad > Math.PI) rad -= Math.PI * 2;
  while (rad < -Math.PI) rad += Math.PI * 2;
  return rad;
}

export interface AIUpdateParams {
  aiState: AICompetitorState;
  playerPos: Vector3D;
  playerSpeedKmh: number;
  splinePoints: SplinePoint[];
  racingLinePoints?: RacingLinePoint[];
  deltaSeconds: number;
  aiPassedSector2Ref: { current: boolean };
}

/**
 * Updates AI competitor physics, intelligent pathfinding, cornering and racing line behavior.
 * Guarantees zero corner-cutting and strict track containment.
 */
export function updateAICompetitor(params: AIUpdateParams): {
  nextAIState: AICompetitorState;
  crossedFinish: boolean;
} {
  const {
    aiState,
    playerPos,
    playerSpeedKmh,
    splinePoints,
    racingLinePoints,
    deltaSeconds,
    aiPassedSector2Ref
  } = params;

  const n = splinePoints.length;
  if (n < 4) {
    return { nextAIState: aiState, crossedFinish: false };
  }

  const dt = Math.max(0.001, Math.min(deltaSeconds, 0.05));
  const currentSpeedMs = aiState.speedKmh / 3.6;
  const currentYaw = aiState.rotation.y;
  const trackLength = splinePoints[n - 1].distance || 1000;

  // 1. Locate AI on Track
  const { nearestIndex, point: nearestSplinePoint } = getNearestSplinePoint(
    aiState.position,
    splinePoints
  );

  const nearestP = nearestSplinePoint || splinePoints[nearestIndex];
  const roadWidth = nearestP.width || 14;
  // Maximum safe lateral distance from centerline (stay safely on asphalt and off grass)
  const maxSafeOffset = Math.max(2.5, (roadWidth / 2) - 1.5);

  // Measure current signed lateral offset from track centerline
  const toAIX = aiState.position.x - nearestP.position.x;
  const toAIZ = aiState.position.z - nearestP.position.z;
  const binormal = nearestP.binormal;
  let currentLatOffset = toAIX * binormal.x + toAIZ * binormal.z;

  // STRICT TRACK CONTAINMENT:
  // If the AI drifts towards or past the track limits, clamp it firmly to the asphalt corridor
  let currentPosX = aiState.position.x;
  let currentPosZ = aiState.position.z;
  if (Math.abs(currentLatOffset) > maxSafeOffset) {
    const clampedOffset = Math.sign(currentLatOffset) * maxSafeOffset;
    currentPosX = nearestP.position.x + binormal.x * clampedOffset;
    currentPosZ = nearestP.position.z + binormal.z * clampedOffset;
    currentLatOffset = clampedOffset;
  }

  // 2. Short, Curve-Conforming Lookahead (NEVER cut across the infield)
  // Look ahead only 2 to 5 segments (~6 to 15 meters) based on speed
  const lookaheadCount = Math.max(2, Math.min(5, Math.round(currentSpeedMs * 0.12)));
  const targetIdx = (nearestIndex + lookaheadCount) % n;
  const targetSpline = splinePoints[targetIdx];

  // 3. Racing Line & Overtake Offset
  let targetLateralOffset = 0;
  if (racingLinePoints && racingLinePoints.length === n) {
    // Extract subtle apex offset if available
    const rLinePos = racingLinePoints[targetIdx].position;
    const offX = rLinePos.x - targetSpline.position.x;
    const offZ = rLinePos.z - targetSpline.position.z;
    const idealOffset = offX * targetSpline.binormal.x + offZ * targetSpline.binormal.z;
    // Bound apex offset well inside track boundaries
    targetLateralOffset = Math.max(-maxSafeOffset * 0.65, Math.min(maxSafeOffset * 0.65, idealOffset));
  }

  // Player Proximity & Overtaking
  const distToPlayer = Math.hypot(
    playerPos.x - currentPosX,
    playerPos.z - currentPosZ
  );

  let forceBraking = false;
  if (distToPlayer < 24) {
    const relX = playerPos.x - currentPosX;
    const relZ = playerPos.z - currentPosZ;
    const cosY = Math.cos(currentYaw);
    const sinY = Math.sin(currentYaw);

    const localForward = relX * sinY + relZ * cosY; // Positive when player is ahead
    const localLateral = relX * cosY - relZ * sinY; // Positive when player is to right

    if (localForward > 0 && localForward < 20) {
      if (Math.abs(localLateral) < 3.0) {
        // Player is directly ahead in AI's path: choose the open side to overtake
        const overtakeSide = localLateral >= 0 ? -2.2 : 2.2;
        targetLateralOffset = Math.max(-maxSafeOffset * 0.85, Math.min(maxSafeOffset * 0.85, overtakeSide));

        // If right behind player's gearbox and going faster, lift off to prevent collision
        if (localForward < 4.5 && aiState.speedKmh > playerSpeedKmh) {
          forceBraking = true;
        }
      }
    }
  }

  // Final Target Point along the track curve
  const targetBinormal = targetSpline.binormal;
  const targetPos = {
    x: targetSpline.position.x + targetBinormal.x * targetLateralOffset,
    y: targetSpline.position.y,
    z: targetSpline.position.z + targetBinormal.z * targetLateralOffset
  };

  // 4. Authentic F1 Curvature Detection & Long Braking Zone Scanning (Up to 85m ahead)
  let targetSpeedMs = 82.0; // 295 km/h on straights
  const maxScanSegments = Math.min(30, Math.floor(n / 3));

  for (let s = 1; s <= maxScanSegments; s++) {
    const idxA = (nearestIndex + s) % n;
    const idxB = (nearestIndex + s + 2) % n;
    const pA = splinePoints[idxA];
    const pB = splinePoints[idxB];

    const segDist = s * (trackLength / n); // approximate distance ahead in meters
    const dot = pA.tangent.x * pB.tangent.x + pA.tangent.z * pB.tangent.z;
    const angleChange = Math.acos(Math.max(-1, Math.min(1, dot)));

    if (angleChange > 0.035) {
      const arcLen = Math.hypot(pB.position.x - pA.position.x, pB.position.z - pA.position.z);
      const radius = Math.max(12, arcLen / Math.max(0.001, angleChange));

      // Maximum cornering speed: V = sqrt(mu * g * R), mu ≈ 2.2 with F1 downforce
      const maxCornerSpeed = Math.min(82.0, Math.sqrt(2.2 * 9.81 * radius));

      // Braking distance needed to decelerate from current speed to corner entry speed
      const aBrake = 38.0; // F1 braking decel m/s^2
      const brakeDist = Math.max(0, (currentSpeedMs * currentSpeedMs - maxCornerSpeed * maxCornerSpeed) / (2 * aBrake));

      // Initiate braking when approaching the braking marker
      if (segDist <= brakeDist + 6.0) {
        targetSpeedMs = Math.min(targetSpeedMs, maxCornerSpeed);
      }
    }
  }

  if (forceBraking) {
    targetSpeedMs = Math.min(targetSpeedMs, (playerSpeedKmh / 3.6) * 0.95);
  }

  // 5. Throttle & Braking Application
  let throttle = 0;
  let brake = 0;

  if (currentSpeedMs < targetSpeedMs - 0.5) {
    throttle = 1.0;
    brake = 0;
  } else if (currentSpeedMs > targetSpeedMs + 1.2) {
    throttle = 0;
    brake = Math.min(1.0, (currentSpeedMs - targetSpeedMs) * 0.25);
  } else {
    throttle = 0.35;
    brake = 0;
  }

  const driveAccel = 36.0;
  const brakeDecel = 46.0;
  const drag = 0.0018 * currentSpeedMs * currentSpeedMs + 1.0;

  let newSpeedMs = currentSpeedMs;
  if (throttle > 0) {
    newSpeedMs += (throttle * driveAccel - drag) * dt;
  } else if (brake > 0) {
    newSpeedMs -= (brake * brakeDecel + drag) * dt;
  } else {
    newSpeedMs -= drag * dt;
  }
  newSpeedMs = Math.max(0, Math.min(83.0, newSpeedMs));

  // 6. Stanley + Pure Pursuit Steering Controller (Heading + Cross-Track Damping)
  const targetYaw = Math.atan2(
    targetPos.x - currentPosX,
    targetPos.z - currentPosZ
  );

  const headingError = normalizeAngle(targetYaw - currentYaw);
  // Cross-track error (difference between current offset and target lane)
  const crossTrackError = currentLatOffset - targetLateralOffset;
  const crossTrackSteer = Math.atan2(-crossTrackError * 0.8, Math.max(6, currentSpeedMs));

  const steeringInput = Math.max(-1, Math.min(1, headingError * 2.5 + crossTrackSteer * 1.4));

  // Responsive turn rate with high-speed stability
  const turnRate = Math.max(1.6, 3.2 - (newSpeedMs / 83.0) * 1.2);
  const newYaw = currentYaw + steeringInput * turnRate * dt;

  // 7. Update Position along Heading with Final Boundary Check
  const dirX = Math.sin(newYaw);
  const dirZ = Math.cos(newYaw);

  let newPosX = currentPosX + dirX * newSpeedMs * dt;
  let newPosZ = currentPosZ + dirZ * newSpeedMs * dt;

  // Re-verify lateral distance against road limits
  const toNewX = newPosX - nearestP.position.x;
  const toNewZ = newPosZ - nearestP.position.z;
  const newLatOffset = toNewX * binormal.x + toNewZ * binormal.z;
  if (Math.abs(newLatOffset) > maxSafeOffset) {
    const clampedNewOffset = Math.sign(newLatOffset) * maxSafeOffset;
    newPosX = nearestP.position.x + binormal.x * clampedNewOffset;
    newPosZ = nearestP.position.z + binormal.z * clampedNewOffset;
  }

  const targetY = nearestP.position.y || 0;
  const newPosY = aiState.position.y + (targetY + 0.05 - aiState.position.y) * (dt * 6.0);

  // 8. Sector & Finish Line Tracking
  const startP = splinePoints[0];
  const vCurrX = newPosX - startP.position.x;
  const vCurrZ = newPosZ - startP.position.z;
  const sCurr = vCurrX * startP.tangent.x + vCurrZ * startP.tangent.z;
  const distFromStart = Math.hypot(vCurrX, vCurrZ);

  // Check if AI has officially started and crossed start line
  let hasStarted = aiState.hasStartedRace ?? false;
  if (!hasStarted && sCurr >= 0) {
    hasStarted = true;
  }

  if (distFromStart > 25 || (nearestIndex > n * 0.25 && nearestIndex < n * 0.95)) {
    aiPassedSector2Ref.current = true;
  }

  let lineCrossed = false;
  if (startP && aiPassedSector2Ref.current) {
    const vPrevX = currentPosX - startP.position.x;
    const vPrevZ = currentPosZ - startP.position.z;

    const sPrev = vPrevX * startP.tangent.x + vPrevZ * startP.tangent.z;
    const latDist = Math.abs(vCurrX * startP.binormal.x + vCurrZ * startP.binormal.z);
    const halfWidth = (startP.width / 2) + 5.0;

    if (sPrev < 0 && sCurr >= 0 && latDist <= halfWidth && distFromStart < 25.0) {
      lineCrossed = true;
      aiPassedSector2Ref.current = false;
    } else if (checkFinishLineCrossing({ x: currentPosX, z: currentPosZ }, { x: newPosX, z: newPosZ }, startP)) {
      lineCrossed = true;
      aiPassedSector2Ref.current = false;
    }
  }

  // Update AI Telemetry
  let nextTelemetry = { ...aiState.lapTelemetry };
  if (lineCrossed && nextTelemetry.currentLapTime > 3.0) {
    const finalLap = nextTelemetry.currentLapTime;
    const isBest = nextTelemetry.bestLapTime === null || finalLap < nextTelemetry.bestLapTime;
    nextTelemetry = {
      ...nextTelemetry,
      currentLapTime: 0,
      lastLapTime: finalLap,
      bestLapTime: isBest ? finalLap : nextTelemetry.bestLapTime,
      completedLaps: nextTelemetry.completedLaps + 1,
      maxSpeedKmh: Math.max(nextTelemetry.maxSpeedKmh, Math.round(newSpeedMs * 3.6))
    };
  } else {
    nextTelemetry = {
      ...nextTelemetry,
      currentLapTime: nextTelemetry.currentLapTime + dt,
      maxSpeedKmh: Math.max(nextTelemetry.maxSpeedKmh, Math.round(newSpeedMs * 3.6))
    };
  }

  const nextAIState: AICompetitorState = {
    ...aiState,
    position: { x: newPosX, y: newPosY, z: newPosZ },
    rotation: { x: 0, y: newYaw, z: steeringInput * -0.04 },
    velocity: { x: dirX * newSpeedMs, y: 0, z: dirZ * newSpeedMs },
    speedKmh: Math.round(newSpeedMs * 3.6),
    throttle,
    brake,
    steering: steeringInput,
    offTrack: false,
    skidding: Math.abs(steeringInput) > 0.7 && newSpeedMs > 30,
    targetSpeedKmh: Math.round(targetSpeedMs * 3.6),
    lapTelemetry: nextTelemetry,
    hasStartedRace: hasStarted
  };

  return { nextAIState, crossedFinish: lineCrossed };
}

/**
 * Handles physical car-to-car collision between Player and AI competitor.
 * Resolves overlap and transfers impulse realistically.
 */
export function resolveCarCollision(
  player: CarState,
  ai: AICompetitorState
): { playerState: CarState; aiState: AICompetitorState } {
  const dx = player.position.x - ai.position.x;
  const dz = player.position.z - ai.position.z;
  const dist = Math.hypot(dx, dz);

  const minSeparation = 2.1; // F1 car width with clearance

  if (dist < minSeparation && dist > 0.001) {
    const overlap = minSeparation - dist;
    const nx = dx / dist;
    const nz = dz / dist;

    // Push each car apart equally along collision normal
    const push = overlap * 0.52;

    const newPlayerPos = {
      x: player.position.x + nx * push,
      y: player.position.y,
      z: player.position.z + nz * push
    };

    const newAIPos = {
      x: ai.position.x - nx * push,
      y: ai.position.y,
      z: ai.position.z - nz * push
    };

    // Elastic bounce impulse transfer
    const relVelX = player.velocity.x - ai.velocity.x;
    const relVelZ = player.velocity.z - ai.velocity.z;
    const impulse = (relVelX * nx + relVelZ * nz) * 0.4;

    const newPlayerVel = {
      x: player.velocity.x - nx * impulse,
      y: player.velocity.y,
      z: player.velocity.z - nz * impulse
    };

    const newAIVel = {
      x: ai.velocity.x + nx * impulse,
      y: ai.velocity.y,
      z: ai.velocity.z + nz * impulse
    };

    return {
      playerState: {
        ...player,
        position: newPlayerPos,
        velocity: newPlayerVel,
        speedKmh: Math.round(Math.hypot(newPlayerVel.x, newPlayerVel.z) * 3.6)
      },
      aiState: {
        ...ai,
        position: newAIPos,
        velocity: newAIVel,
        speedKmh: Math.round(Math.hypot(newAIVel.x, newAIVel.z) * 3.6)
      }
    };
  }

  return { playerState: player, aiState: ai };
}

/**
 * Calculates live race position ranking (P1/P2) and time/distance gap.
 * Robust against start grid offsets and loop wrap singularities.
 */
export function calculateRaceBattle(
  playerPos: Vector3D,
  playerTelemetry: LapTelemetry,
  aiPos: Vector3D,
  aiTelemetry: LapTelemetry,
  splinePoints: SplinePoint[],
  aiHasStarted: boolean = false
): RaceBattleState {
  if (splinePoints.length === 0) {
    return { playerRank: 1, aiRank: 2, gapSeconds: 0, gapMeters: 0 };
  }

  const trackLength = splinePoints[splinePoints.length - 1].distance || 1000;
  const startP = splinePoints[0];

  const getCarProgress = (pos: Vector3D, completedLaps: number, isAI: boolean) => {
    const nearest = getNearestSplinePoint(pos, splinePoints);
    let dist = nearest.point ? nearest.point.distance : 0;

    // Check signed distance relative to start line plane
    const vx = pos.x - startP.position.x;
    const vz = pos.z - startP.position.z;
    const s = vx * startP.tangent.x + vz * startP.tangent.z;

    // If on Lap 0 before crossing start line, use exact signed tangent position
    if (completedLaps === 0) {
      if (isAI && !aiHasStarted && s < 0) {
        dist = s; // E.g. -8.5m on starting grid
      } else if (!isAI && s < 0 && dist > trackLength * 0.7) {
        dist = s;
      }
    }

    return completedLaps * trackLength + dist;
  };

  const playerProgress = getCarProgress(playerPos, playerTelemetry.completedLaps, false);
  const aiProgress = getCarProgress(aiPos, aiTelemetry.completedLaps, true);

  const progressDiff = playerProgress - aiProgress;
  const playerRank = progressDiff >= 0 ? 1 : 2;
  const aiRank = progressDiff >= 0 ? 2 : 1;

  const gapMeters = Math.round(Math.abs(progressDiff));
  // Estimated time gap based on nominal 50 m/s (~180 km/h) racing pace
  const gapSeconds = Math.round((gapMeters / 50.0) * 10) / 10;

  return {
    playerRank,
    aiRank,
    gapSeconds,
    gapMeters
  };
}
