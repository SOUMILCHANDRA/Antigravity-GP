import { AICompetitorState, AIDifficulty, CarState, LapTelemetry, RaceBattleState, SplinePoint, Vector3D } from '../types/track';
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
export function createAICompetitor(
  splinePoints: SplinePoint[],
  difficulty: AIDifficulty = 'challenger'
): AICompetitorState {
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
      hasStartedRace: false,
      difficulty,
      isDrafting: false,
      isOvertaking: false
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
    hasStartedRace: false,
    difficulty,
    isDrafting: false,
    isOvertaking: false
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

/**
 * Calculates geometric circumcircle radius of triangle (p1, p2, p3) in 2D X-Z plane.
 * Provides exact, noise-free local track curvature radius.
 */
function computeCurvatureRadius(p1: Vector3D, p2: Vector3D, p3: Vector3D): number {
  const a = Math.hypot(p2.x - p1.x, p2.z - p1.z);
  const b = Math.hypot(p3.x - p2.x, p3.z - p2.z);
  const c = Math.hypot(p1.x - p3.x, p1.z - p3.z);
  const area = 0.5 * Math.abs((p2.x - p1.x) * (p3.z - p1.z) - (p2.z - p1.z) * (p3.x - p1.x));
  if (area < 1e-4) return 9999;
  return Math.max(10, Math.min(9999, (a * b * c) / (4 * area)));
}

/**
 * Computes maximum cornering velocity based on radius and F1 aerodynamic downforce.
 */
function getTargetCornerSpeedMs(radius: number, difficulty: AIDifficulty = 'challenger'): number {
  let gripMu = 2.4;
  if (radius > 160) gripMu = 3.6; // High-speed downforce sweeper
  else if (radius > 80) gripMu = 3.0; // Medium-speed corner
  else if (radius > 40) gripMu = 2.6;

  let speed = Math.sqrt(gripMu * 9.81 * radius);

  if (difficulty === 'rookie') speed *= 0.85;
  if (difficulty === 'legend') speed *= 1.08;

  const maxTopSpeed = difficulty === 'legend' ? 92.0 : (difficulty === 'rookie' ? 76.0 : 88.0);
  return Math.min(maxTopSpeed, Math.max(22.0, speed));
}

export interface AIUpdateParams {
  aiState: AICompetitorState;
  playerPos: Vector3D;
  playerSpeedKmh: number;
  splinePoints: SplinePoint[];
  racingLinePoints?: RacingLinePoint[];
  deltaSeconds: number;
  aiPassedSector2Ref: { current: boolean };
  difficulty?: AIDifficulty;
  playerProgressDiff?: number; // Positive if player is ahead, negative if AI leads
}

/**
 * Competitive Racing AI Engine:
 * - High-speed F1 aerodynamic cornering & 310+ km/h straight-line pace
 * - Long-horizon multi-point braking zone scanner
 * - Slipstream / DRS aerodynamic drafting (+15 km/h tow)
 * - Intelligent overtaking maneuvers into open track space
 * - Adaptive pack racing push factor to sustain intense wheel-to-wheel battles
 * - Strict asphalt boundary enforcement (zero grass corner-cutting)
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
    aiPassedSector2Ref,
    difficulty = aiState.difficulty || 'challenger',
    playerProgressDiff = 0
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
  const maxSafeOffset = Math.max(2.5, (roadWidth / 2) - 1.4);

  // Measure current signed lateral offset from track centerline
  const toAIX = aiState.position.x - nearestP.position.x;
  const toAIZ = aiState.position.z - nearestP.position.z;
  const binormal = nearestP.binormal;
  let currentLatOffset = toAIX * binormal.x + toAIZ * binormal.z;

  // STRICT TRACK CONTAINMENT:
  // Hard-clamp the AI's position to the asphalt corridor so it can NEVER cut corners or enter grass
  let currentPosX = aiState.position.x;
  let currentPosZ = aiState.position.z;
  if (Math.abs(currentLatOffset) > maxSafeOffset) {
    const clampedOffset = Math.sign(currentLatOffset) * maxSafeOffset;
    currentPosX = nearestP.position.x + binormal.x * clampedOffset;
    currentPosZ = nearestP.position.z + binormal.z * clampedOffset;
    currentLatOffset = clampedOffset;
  }

  // 2. Adaptive Race Pacing (Pack Racing & High-Stakes Duel)
  // If player pulls away by > 15m, AI enters PUSH mode (+10% pace, aggressive late-braking)
  let pushFactor = 1.0;
  if (playerProgressDiff > 12) {
    pushFactor = Math.min(1.12, 1.0 + (playerProgressDiff - 12) * 0.0025);
  } else if (playerProgressDiff < -35) {
    // If AI is leading by 35+ meters, ease slightly so player can fight back
    pushFactor = 0.95;
  }

  // 3. Multi-Distance Braking Zone Scanner (Samples upcoming corners up to 90m ahead)
  let targetSpeedMs = (difficulty === 'legend' ? 92.0 : (difficulty === 'rookie' ? 76.0 : 88.0)) * pushFactor;
  const aBrake = 44.0; // F1 carbon-ceramic braking deceleration in m/s^2

  const scanOffsets = [3, 6, 10, 15, 22, 30];
  for (const s of scanOffsets) {
    const idxB = (nearestIndex + s) % n;
    const idxA = (idxB - 3 + n) % n;
    const idxC = (idxB + 3) % n;

    const pA = splinePoints[idxA].position;
    const pB = splinePoints[idxB].position;
    const pC = splinePoints[idxC].position;

    const radius = computeCurvatureRadius(pA, pB, pC);

    if (radius < 220) {
      const cornerSpeed = getTargetCornerSpeedMs(radius, difficulty) * pushFactor;
      const distToCorner = s * (trackLength / n);
      const brakeDistNeeded = Math.max(0, (currentSpeedMs * currentSpeedMs - cornerSpeed * cornerSpeed) / (2 * aBrake));

      // Late braking margin: push later when chasing hard
      const margin = pushFactor > 1.0 ? 3.0 : 5.0;
      if (distToCorner <= brakeDistNeeded + margin) {
        targetSpeedMs = Math.min(targetSpeedMs, cornerSpeed);
      }
    }
  }

  // 4. Short Curve-Conforming Lookahead (NEVER cuts across the infield)
  const lookaheadCount = Math.max(2, Math.min(6, Math.round(currentSpeedMs * 0.12)));
  const targetIdx = (nearestIndex + lookaheadCount) % n;
  const targetSpline = splinePoints[targetIdx];

  // 5. Racing Line, Slipstream Tow & Overtake Maneuvers
  let targetLateralOffset = 0;
  if (racingLinePoints && racingLinePoints.length === n) {
    const rLinePos = racingLinePoints[targetIdx].position;
    const offX = rLinePos.x - targetSpline.position.x;
    const offZ = rLinePos.z - targetSpline.position.z;
    const idealOffset = offX * targetSpline.binormal.x + offZ * targetSpline.binormal.z;
    targetLateralOffset = Math.max(-maxSafeOffset * 0.6, Math.min(maxSafeOffset * 0.6, idealOffset));
  }

  const relX = playerPos.x - currentPosX;
  const relZ = playerPos.z - currentPosZ;
  const cosY = Math.cos(currentYaw);
  const sinY = Math.sin(currentYaw);

  const localForward = relX * sinY + relZ * cosY; // Distance ahead
  const localLateral = relX * cosY - relZ * sinY; // Distance to side

  // Slipstream / DRS Detection: Following within 5m to 48m behind player
  let isDrafting = false;
  let isOvertaking = false;

  if (localForward > 4.0 && localForward < 48.0 && Math.abs(localLateral) < 4.5) {
    isDrafting = true;
  }

  // Tactical Overtaking: Commit to open track lane when closing within 22m
  if (localForward > 1.5 && localForward < 22.0) {
    isOvertaking = true;
    const overtakeSide = localLateral >= 0 ? -2.4 : 2.4;
    targetLateralOffset = Math.max(-maxSafeOffset * 0.85, Math.min(maxSafeOffset * 0.85, overtakeSide));
  }

  // Defensive Racing Line: If AI is leading and player is right behind, defend inside apex
  if (localForward < -3.0 && localForward > -25.0) {
    if (Math.abs(targetLateralOffset) > 0.4) {
      targetLateralOffset *= 1.25; // Hug inside line tighter
    }
  }

  // Target Point on track curve with lane offset
  const targetBinormal = targetSpline.binormal;
  const targetPos = {
    x: targetSpline.position.x + targetBinormal.x * targetLateralOffset,
    y: targetSpline.position.y,
    z: targetSpline.position.z + targetBinormal.z * targetLateralOffset
  };

  // 6. Throttle & Braking Application with Slipstream Aero Boost
  let driveAccel = (difficulty === 'legend' ? 44.0 : 41.0) * pushFactor;
  let dragCoeff = 0.0018;

  if (isDrafting) {
    // Sucking into the slipstream: lower drag, extra horsepower boost
    dragCoeff *= 0.65;
    driveAccel *= 1.18;
    targetSpeedMs += 4.5; // ~+16 km/h top speed boost!
  }

  let throttle = 0;
  let brake = 0;

  // Collision prevention: only ease throttle if literally touching the rear bumper
  const touchingRearBumper = localForward > 0.5 && localForward < 2.5 && Math.abs(localLateral) < 1.6;

  if (touchingRearBumper && aiState.speedKmh > playerSpeedKmh) {
    throttle = 0.2;
    brake = 0.35;
  } else if (currentSpeedMs < targetSpeedMs - 0.4) {
    // PIN 100% FULL THROTTLE!
    throttle = 1.0;
    brake = 0;
  } else if (currentSpeedMs > targetSpeedMs + 1.2) {
    // HARD BRAKING INTO CORNER
    throttle = 0;
    brake = Math.min(1.0, (currentSpeedMs - targetSpeedMs) * 0.28);
  } else {
    // Maintain maximum cornering velocity
    throttle = 0.85;
    brake = 0;
  }

  const drag = dragCoeff * currentSpeedMs * currentSpeedMs + 1.0;
  let newSpeedMs = currentSpeedMs;
  if (throttle > 0) {
    newSpeedMs += (throttle * driveAccel - drag) * dt;
  } else if (brake > 0) {
    newSpeedMs -= (brake * aBrake + drag) * dt;
  } else {
    newSpeedMs -= drag * dt;
  }
  newSpeedMs = Math.max(0, Math.min(95.0, newSpeedMs));

  // 7. Stanley + Pure Pursuit Steering Controller
  const targetYaw = Math.atan2(
    targetPos.x - currentPosX,
    targetPos.z - currentPosZ
  );

  const headingError = normalizeAngle(targetYaw - currentYaw);
  const crossTrackError = currentLatOffset - targetLateralOffset;
  const crossTrackSteer = Math.atan2(-crossTrackError * 0.85, Math.max(6, currentSpeedMs));

  const steeringInput = Math.max(-1, Math.min(1, headingError * 2.6 + crossTrackSteer * 1.5));

  // Responsive turn rate with high-speed stability
  const turnRate = Math.max(1.7, 3.2 - (newSpeedMs / 88.0) * 1.1);
  const newYaw = currentYaw + steeringInput * turnRate * dt;

  // 8. Update Position along Heading with Final Boundary Protection
  const dirX = Math.sin(newYaw);
  const dirZ = Math.cos(newYaw);

  let newPosX = currentPosX + dirX * newSpeedMs * dt;
  let newPosZ = currentPosZ + dirZ * newSpeedMs * dt;

  // Re-verify lateral distance against asphalt boundaries
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

  // 9. Sector & Finish Line Tracking
  const startP = splinePoints[0];
  const vCurrX = newPosX - startP.position.x;
  const vCurrZ = newPosZ - startP.position.z;
  const sCurr = vCurrX * startP.tangent.x + vCurrZ * startP.tangent.z;
  const distFromStart = Math.hypot(vCurrX, vCurrZ);

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
    skidding: Math.abs(steeringInput) > 0.65 && newSpeedMs > 35,
    targetSpeedKmh: Math.round(targetSpeedMs * 3.6),
    lapTelemetry: nextTelemetry,
    hasStartedRace: hasStarted,
    difficulty,
    isDrafting,
    isOvertaking
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
