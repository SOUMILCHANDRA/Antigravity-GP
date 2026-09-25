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
  playerThrottle?: boolean;
  splinePoints: SplinePoint[];
  racingLinePoints?: RacingLinePoint[];
  deltaSeconds: number;
  aiPassedSector2Ref: { current: boolean };
  difficulty?: AIDifficulty;
  playerProgressDiff?: number; // Positive if player is ahead, negative if AI leads
}

/**
 * Competitive F1 Racing AI Engine:
 * - Real Grand Prix Grid Launch: stages alongside player on Slot 2 and launches with player
 * - Curve-Conforming Waypoint Lookahead: pins right to the apex without cutting grass
 * - Pure Pursuit + Curvature Feedforward: eliminates wobbles, rail-grinding, and inverted steering
 * - 320+ km/h F1 Top Speed & Late-Braking Carbon Ceramic Aerodynamics
 * - Slipstream DRS Tow (+20 km/h top speed boost & 40% drag cut)
 * - Slingshot Overtaking Maneuvers into open track space
 * - Side-by-Side Wheel-to-Wheel racing room respect
 * - Inside Apex Defense when leading
 * - Adaptive Push Pacing to sustain intense wheel-to-wheel duels
 */
export function updateAICompetitor(params: AIUpdateParams): {
  nextAIState: AICompetitorState;
  crossedFinish: boolean;
} {
  const {
    aiState,
    playerPos,
    playerSpeedKmh,
    playerThrottle = false,
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

  // 1. Grid Staging & Race Start Synchronization
  let hasStarted = aiState.hasStartedRace ?? false;
  const playerHasLaunched = playerSpeedKmh > 1.5 || playerThrottle;

  if (!hasStarted) {
    if (!playerHasLaunched) {
      // Stage stationary in Starting Grid Slot 2, waiting for race start
      return {
        nextAIState: {
          ...aiState,
          speedKmh: 0,
          velocity: { x: 0, y: 0, z: 0 },
          throttle: 0,
          brake: 1.0,
          steering: 0,
          skidding: false,
          hasStartedRace: false,
          isDrafting: false,
          isOvertaking: false
        },
        crossedFinish: false
      };
    }
    // "LIGHTS OUT AND AWAY WE GO!" - AI launches off the grid
    hasStarted = true;
  }

  // 2. Locate AI on Track & Measure Boundaries
  const { nearestIndex, point: nearestSplinePoint } = getNearestSplinePoint(
    aiState.position,
    splinePoints
  );

  const nearestP = nearestSplinePoint || splinePoints[nearestIndex];
  const roadWidth = nearestP.width || 14;
  // Safe lateral distance: stay firmly within asphalt boundaries
  const maxSafeOffset = Math.max(2.5, (roadWidth / 2) - 1.3);

  // Measure current signed lateral offset from track centerline along binormal
  const toAIX = aiState.position.x - nearestP.position.x;
  const toAIZ = aiState.position.z - nearestP.position.z;
  const binormal = nearestP.binormal;
  let currentLatOffset = toAIX * binormal.x + toAIZ * binormal.z;

  let currentPosX = aiState.position.x;
  let currentPosZ = aiState.position.z;

  // Soft boundary protection: prevent any initial grass clipping
  if (Math.abs(currentLatOffset) > maxSafeOffset) {
    const clampedOffset = Math.sign(currentLatOffset) * maxSafeOffset;
    currentPosX = nearestP.position.x + binormal.x * clampedOffset;
    currentPosZ = nearestP.position.z + binormal.z * clampedOffset;
    currentLatOffset = clampedOffset;
  }

  // 3. Dynamic Push Factor (Adaptive Racing Pacing)
  // When chasing player, AI pushes hard in qualifying pace (+14% performance boost)
  let pushFactor = 1.0;
  if (playerProgressDiff > 6) {
    pushFactor = Math.min(1.14, 1.0 + (playerProgressDiff - 6) * 0.0035);
  } else if (playerProgressDiff < -40) {
    // If AI is leading by 40+ meters, stabilize pace to keep duel alive
    pushFactor = 0.94;
  }

  // 4. Multi-Distance Carbon Ceramic Braking Zone Scanner
  const aBrake = difficulty === 'legend' ? 48.0 : (difficulty === 'rookie' ? 40.0 : 45.0);
  let targetSpeedMs = (difficulty === 'legend' ? 94.0 : (difficulty === 'rookie' ? 76.0 : 88.0)) * pushFactor;

  const scanOffsets = [2, 4, 7, 11, 16, 22, 29, 37];
  for (const s of scanOffsets) {
    const idxB = (nearestIndex + s) % n;
    const idxA = (idxB - 3 + n) % n;
    const idxC = (idxB + 3) % n;

    const pA = splinePoints[idxA].position;
    const pB = splinePoints[idxB].position;
    const pC = splinePoints[idxC].position;

    const radius = computeCurvatureRadius(pA, pB, pC);

    if (radius < 260) {
      const cornerSpeed = getTargetCornerSpeedMs(radius, difficulty) * pushFactor;
      const distToCorner = s * (trackLength / n);
      const brakeDistNeeded = Math.max(0, (currentSpeedMs * currentSpeedMs - cornerSpeed * cornerSpeed) / (2 * aBrake));

      const margin = pushFactor > 1.0 ? 2.5 : 4.5;
      if (distToCorner <= brakeDistNeeded + margin) {
        targetSpeedMs = Math.min(targetSpeedMs, cornerSpeed);
      }
    }
  }

  // 5. Curve-Conforming Dynamic Waypoint Lookahead
  // Looks 12m to 42m ahead, but clips lookahead around sharp turns so it aims directly at the apex
  const lookAheadDist = 12.0 + currentSpeedMs * 0.32;
  let accumulatedDist = 0;
  let accumulatedAngle = 0;
  let targetIdx = nearestIndex;

  for (let step = 1; step <= 25; step++) {
    const nextIdx = (nearestIndex + step) % n;
    const pA = splinePoints[(nextIdx - 1 + n) % n];
    const pB = splinePoints[nextIdx];
    const segDist = Math.hypot(pB.position.x - pA.position.x, pB.position.z - pA.position.z);
    accumulatedDist += segDist;

    const dot = Math.max(-1, Math.min(1, pA.tangent.x * pB.tangent.x + pA.tangent.z * pB.tangent.z));
    accumulatedAngle += Math.acos(dot);

    targetIdx = nextIdx;
    if (accumulatedDist >= lookAheadDist) break;
    // Don't look past the apex of a sharp turn
    if (accumulatedAngle > 0.65) break;
  }

  const targetSpline = splinePoints[targetIdx];

  // 6. Ideal Racing Line Offset (Out-In-Out Apexing)
  let targetLateralOffset = 0;
  if (racingLinePoints && racingLinePoints.length === n) {
    const rPoint = racingLinePoints[targetIdx];
    const offX = rPoint.position.x - targetSpline.position.x;
    const offZ = rPoint.position.z - targetSpline.position.z;
    const idealOffset = offX * targetSpline.binormal.x + offZ * targetSpline.binormal.z;
    targetLateralOffset = Math.max(-maxSafeOffset * 0.75, Math.min(maxSafeOffset * 0.75, idealOffset));
  }

  // 7. Tactical Racecraft (Slipstream Tow, Slingshot Pass, Defense & Space)
  const relX = playerPos.x - currentPosX;
  const relZ = playerPos.z - currentPosZ;
  const cosY = Math.cos(currentYaw);
  const sinY = Math.sin(currentYaw);

  const localForward = relX * sinY + relZ * cosY; // Distance ahead (+) or behind (-)
  const localLateral = relX * cosY - relZ * sinY; // Distance to right (+) or left (-)

  const toPlayerX = playerPos.x - nearestP.position.x;
  const toPlayerZ = playerPos.z - nearestP.position.z;
  const playerLatOffset = toPlayerX * nearestP.binormal.x + toPlayerZ * nearestP.binormal.z;

  let isDrafting = false;
  let isOvertaking = false;

  // A. Slipstream Tow: Following within 4.5m to 52m behind player in draft corridor
  if (localForward > 4.5 && localForward < 52.0 && Math.abs(localLateral) < 4.2) {
    isDrafting = true;
    targetLateralOffset = Math.max(-maxSafeOffset * 0.8, Math.min(maxSafeOffset * 0.8, playerLatOffset));
  }

  // B. Slingshot Overtake: Pulling out into clear air when closing fast
  if (localForward > 1.2 && localForward < 26.0 && (aiState.speedKmh >= playerSpeedKmh - 5 || isDrafting)) {
    isOvertaking = true;
    const passSide = playerLatOffset >= 0 ? -2.6 : 2.6;
    targetLateralOffset = Math.max(-maxSafeOffset * 0.85, Math.min(maxSafeOffset * 0.85, passSide));
  }

  // C. Wheel-to-Wheel Racing: Side-by-side room respect
  if (Math.abs(localForward) <= 3.8 && Math.abs(localLateral) < 3.2) {
    const giveRoom = localLateral > 0 ? -2.2 : 2.2;
    targetLateralOffset = Math.max(-maxSafeOffset * 0.85, Math.min(maxSafeOffset * 0.85, giveRoom));
  }

  // D. Defensive Driving: Cover inside line when leading into braking zone
  if (localForward < -2.5 && localForward > -28.0) {
    if (Math.abs(targetLateralOffset) > 0.3) {
      targetLateralOffset *= 1.25;
    }
  }

  // Target waypoint in 3D world space
  const targetBinormal = targetSpline.binormal;
  const targetPos = {
    x: targetSpline.position.x + targetBinormal.x * targetLateralOffset,
    y: targetSpline.position.y,
    z: targetSpline.position.z + targetBinormal.z * targetLateralOffset
  };

  // 8. Throttle & Braking Dynamics with DRS Boost
  let driveAccel = (difficulty === 'legend' ? 44.0 : (difficulty === 'rookie' ? 36.0 : 41.0)) * pushFactor;
  let dragCoeff = 0.0018;

  if (isDrafting) {
    dragCoeff *= 0.60;     // 40% drag reduction in tow
    driveAccel *= 1.22;    // +22% drive power
    targetSpeedMs += 5.5;  // +20 km/h DRS top speed
  }

  let throttle = 0;
  let brake = 0;

  // Collision prevention: ease off only if literally touching rear bumper
  const touchingRearBumper = localForward > 0.5 && localForward < 2.4 && Math.abs(localLateral) < 1.5;

  if (touchingRearBumper && aiState.speedKmh > playerSpeedKmh) {
    throttle = 0.2;
    brake = 0.4;
  } else if (currentSpeedMs < targetSpeedMs - 0.3) {
    // PIN 100% FULL THROTTLE!
    throttle = 1.0;
    brake = 0;
  } else if (currentSpeedMs > targetSpeedMs + 1.0) {
    // HARD BRAKING INTO CORNER
    throttle = 0;
    brake = Math.min(1.0, (currentSpeedMs - targetSpeedMs) * 0.32);
  } else {
    // Maintain maximum cornering velocity
    throttle = 0.90;
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
  newSpeedMs = Math.max(0, Math.min(96.0, newSpeedMs));

  // 9. Pure Pursuit + Curvature Feedforward Steering Controller
  const dx = targetPos.x - currentPosX;
  const dz = targetPos.z - currentPosZ;
  const distToTarget = Math.hypot(dx, dz) || 1;

  // Lateral error to target in car's local heading frame
  const ey = dx * Math.cos(currentYaw) - dz * Math.sin(currentYaw);
  const curvature = (2 * ey) / (distToTarget * distToTarget);

  const targetYaw = Math.atan2(dx, dz);
  const headingError = normalizeAngle(targetYaw - currentYaw);

  const purePursuitSteer = curvature * 4.4;
  const steeringInput = Math.max(-1, Math.min(1, purePursuitSteer * 0.70 + headingError * 1.30));

  // Agile turn rate at low speed, high downforce stability at 300+ km/h
  const turnRate = Math.max(1.8, 3.4 - (newSpeedMs / 90.0) * 1.2);
  let newYaw = currentYaw + steeringInput * turnRate * dt;

  // 10. Update Position with Smooth Kerb Deflection
  const dirX = Math.sin(newYaw);
  const dirZ = Math.cos(newYaw);

  let newPosX = currentPosX + dirX * newSpeedMs * dt;
  let newPosZ = currentPosZ + dirZ * newSpeedMs * dt;

  // Smooth kerb boundary compliance: deflect gently instead of rigid teleport
  const toNewX = newPosX - nearestP.position.x;
  const toNewZ = newPosZ - nearestP.position.z;
  const newLatOffset = toNewX * binormal.x + toNewZ * binormal.z;

  if (Math.abs(newLatOffset) > maxSafeOffset) {
    const clampedNewOffset = Math.sign(newLatOffset) * maxSafeOffset;
    newPosX = nearestP.position.x + binormal.x * clampedNewOffset;
    newPosZ = nearestP.position.z + binormal.z * clampedNewOffset;

    // Smoothly align heading along track tangent so the car flows around the edge
    const tangentYaw = Math.atan2(nearestP.tangent.x, nearestP.tangent.z);
    newYaw = normalizeAngle(newYaw * 0.85 + tangentYaw * 0.15);
  }

  const targetY = nearestP.position.y || 0;
  const newPosY = aiState.position.y + (targetY + 0.05 - aiState.position.y) * (dt * 6.0);

  // 11. Sector & Finish Line Tracking
  const startP = splinePoints[0];
  const vCurrX = newPosX - startP.position.x;
  const vCurrZ = newPosZ - startP.position.z;
  const sCurr = vCurrX * startP.tangent.x + vCurrZ * startP.tangent.z;
  const distFromStart = Math.hypot(vCurrX, vCurrZ);

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
