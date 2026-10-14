import * as THREE from 'three';
import { CarState, SplinePoint, TrackConfig } from '../types/track';
import { getNearestSplinePoint, getTrackSpawnTransform } from './spline';
import { CAR_PRESETS, CarSpecs, DEFAULT_PLAYER_CAR_ID } from './carPresets';

export interface CarControlInputs {
  throttle: boolean; // Accelerate W / Up
  brake: boolean;    // Brake / Reverse S / Down / Space
  left: boolean;     // Steer Left A / Left
  right: boolean;    // Steer Right D / Right
  reset: boolean;    // Reset R
}

export function createInitialCarState(carId: string = DEFAULT_PLAYER_CAR_ID): CarState {
  return {
    position: { x: 0, y: 0.10, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    speedKmh: 0,
    throttle: 0,
    brake: 0,
    steering: 0,
    offTrack: false,
    skidding: false,
    carId
  };
}

/**
 * Single Authoritative Reset Function: Resets position, rotation, velocity, speed, throttle, and steering.
 */
export function resetVehicle(carState: CarState, splinePoints: SplinePoint[]): CarState {
  if (splinePoints.length < 2) return createInitialCarState(carState.carId);

  const spawn = getTrackSpawnTransform(splinePoints);

  return {
    position: { ...spawn.position },
    rotation: { ...spawn.rotation },
    velocity: { x: 0, y: 0, z: 0 },
    speedKmh: 0,
    throttle: 0,
    brake: 0,
    steering: 0,
    offTrack: false,
    skidding: false,
    carId: carState.carId
  };
}

/**
 * Computes exact 3D surface alignment, height, pitch, yaw, and roll on banked/elevated track
 */
export function computeVehicleSurfaceAlignment(
  posX: number,
  posZ: number,
  headingYaw: number,
  nearestPoint: SplinePoint | null,
  rideHeight: number = 0.14
): {
  surfaceY: number;
  pitch: number;
  yaw: number;
  roll: number;
} {
  if (!nearestPoint) {
    return { surfaceY: rideHeight, pitch: 0, yaw: headingYaw, roll: 0 };
  }

  const bankRad = (nearestPoint.banking || 0) * (Math.PI / 180);
  const cosBank = Math.cos(bankRad);
  const sinBank = Math.sin(bankRad);

  // Banked lateral vector across track surface
  const bLatX = nearestPoint.binormal.x * cosBank + nearestPoint.normal.x * sinBank;
  const bLatY = nearestPoint.binormal.y * cosBank + nearestPoint.normal.y * sinBank;
  const bLatZ = nearestPoint.binormal.z * cosBank + nearestPoint.normal.z * sinBank;

  // Banked surface normal (perpendicular to road surface)
  const bUpX = -nearestPoint.binormal.x * sinBank + nearestPoint.normal.x * cosBank;
  const bUpY = -nearestPoint.binormal.y * sinBank + nearestPoint.normal.y * cosBank;
  const bUpZ = -nearestPoint.binormal.z * sinBank + nearestPoint.normal.z * cosBank;

  // Lateral distance from track centerline
  const toCarX = posX - nearestPoint.position.x;
  const toCarZ = posZ - nearestPoint.position.z;
  const latOffset = toCarX * bLatX + toCarZ * bLatZ;

  let surfaceY = (nearestPoint.position.y || 0) + bLatY * latOffset + bUpY * rideHeight;

  // Smooth terrain slope if off beyond runoff
  const halfW = (nearestPoint.width || 14) / 2;
  const runoffW = nearestPoint.runoffWidth || 8.5;
  const totalTrackMargin = halfW + runoffW + 2.0;
  const absLat = Math.abs(latOffset);

  if (absLat > totalTrackMargin) {
    const excess = absLat - totalTrackMargin;
    const slopeFalloff = Math.max(0, 1.0 - excess / 50.0);
    surfaceY = Math.max(0, surfaceY * slopeFalloff + 0.14);
  }

  // Heading vector along horizontal plane
  const hX = Math.sin(headingYaw);
  const hZ = Math.cos(headingYaw);

  // Project heading onto the surface plane: F = normalize(h - (h . bUp) * bUp)
  const hDotUp = hX * bUpX + hZ * bUpZ;
  let fX = hX - bUpX * hDotUp;
  let fY = -bUpY * hDotUp;
  let fZ = hZ - bUpZ * hDotUp;
  const fLen = Math.hypot(fX, fY, fZ) || 1;
  fX /= fLen;
  fY /= fLen;
  fZ /= fLen;

  // Car local Right vector R = bUp x F
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
    surfaceY,
    pitch: euler.x,
    yaw: euler.y,
    roll: euler.z
  };
}

export function updateCarPhysics(
  currentState: CarState,
  inputs: CarControlInputs,
  splinePoints: SplinePoint[],
  deltaSeconds: number,
  carSpecs?: CarSpecs,
  trackConfig?: TrackConfig
): CarState {
  const specs = carSpecs || CAR_PRESETS[currentState.carId || DEFAULT_PLAYER_CAR_ID] || CAR_PRESETS[DEFAULT_PLAYER_CAR_ID];
  const p = specs.physics;

  // Guard delta time against 0, NaN, or large spikes
  const rawDt = isNaN(deltaSeconds) ? 0.016 : deltaSeconds;
  const dt = Math.max(0.001, Math.min(rawDt, 0.05));

  // 1. Exact Distance to Track Centerline via Segment Projection
  const { point: nearestPoint, distance } = getNearestSplinePoint(
    currentState.position,
    splinePoints
  );

  // Check Pit Lane Zone
  let isInsidePitLane = false;
  const halfWidth = nearestPoint ? nearestPoint.width / 2 : 7;
  if (trackConfig?.pitLane?.enabled && nearestPoint && splinePoints.length > 2) {
    const isRight = trackConfig.pitLane.side !== 'left';
    const sideMult = isRight ? 1 : -1;
    const pitLaneWidth = trackConfig.pitLane.width || 7.5;
    const toCarX = currentState.position.x - nearestPoint.position.x;
    const toCarZ = currentState.position.z - nearestPoint.position.z;
    const latOffset = (toCarX * nearestPoint.binormal.x + toCarZ * nearestPoint.binormal.z) * sideMult;
    const trackLen = splinePoints[splinePoints.length - 1].distance;

    const isNearStart = nearestPoint.distance < 120 || (trackLen > 0 && nearestPoint.distance > trackLen - 120);
    if (isNearStart && latOffset >= halfWidth + 0.6 && latOffset <= halfWidth + 0.8 + pitLaneWidth) {
      isInsidePitLane = true;
    }
  }

  // Track zones: Asphalt Road -> Kerb -> Sand/Gravel Runoff Trap
  const kerbMargin = 0.65; // 0.65m kerbs
  const runoffMargin = nearestPoint ? (nearestPoint.runoffWidth || 8.5) : 8.5;
  const isOnTrack = distance <= halfWidth || isInsidePitLane;
  const isOnKerb = !isInsidePitLane && distance > halfWidth && distance <= (halfWidth + kerbMargin);
  const isInGravel = !isInsidePitLane && distance > (halfWidth + kerbMargin);
  const isOffTrack = isInGravel;

  // Banking angle physics (normal force boost & lateral grip)
  const bankDeg = nearestPoint ? (nearestPoint.banking || 0) : 0;
  const bankRad = bankDeg * (Math.PI / 180);
  const cosBank = Math.cos(bankRad);
  // Banking increases tire normal load: F_N = m * (g * cos(theta) + v^2/R * sin(theta))
  // Effective grip factor boosted by up to 15% on banked carousels
  const bankingGripBoost = Math.max(0.95, 1.0 + Math.abs(Math.sin(bankRad)) * 0.35);

  // 2. Steering Input (-1 to +1)
  let targetSteer = 0;
  if (inputs.left) targetSteer += 1;
  if (inputs.right) targetSteer -= 1;

  const currentSteering = isNaN(currentState.steering) ? 0 : currentState.steering;
  const steeringRate = 10.0;
  const steering = currentSteering + (targetSteer - currentSteering) * (dt * steeringRate);

  // 3. Inputs
  const throttle = inputs.throttle ? 1.0 : 0.0;
  const brake = inputs.brake ? 1.0 : 0.0;

  // 4. Stable Speed Calculation (Persistent scalar speed, zero angular-projection loss)
  const currentSpeedKmh = isNaN(currentState.speedKmh) ? 0 : currentState.speedKmh;
  let currentSpeedMs = currentSpeedKmh / 3.6;

  // Performance parameters from CarSpecs
  const maxDriveAccel = p.maxDriveAccel;
  const brakeDecel = p.brakeDecel;
  const reverseAccel = p.reverseAccel;
  const reverseMaxSpeedMs = p.reverseMaxSpeedMs;
  const maxForwardSpeedMs = p.maxForwardSpeedMs;
  const dragCoeff = p.dragCoeff;
  const rollingFriction = p.rollingFriction;
  const engineBrakingVal = p.engineBraking;
  const gripMultiplier = p.gripMultiplier;

  // Surface Grip: base grip adjusted by tire/aero multiplier and banking
  const baseSurfaceGrip = isInGravel ? 0.45 : (isOnKerb ? 0.90 : 1.0);
  const surfaceGrip = baseSurfaceGrip * (isOnTrack ? gripMultiplier * bankingGripBoost : 1.0);

  // Natural aerodynamic drag
  const dragForce = dragCoeff * currentSpeedMs * currentSpeedMs + rollingFriction;

  let newSpeedMs = currentSpeedMs;

  if (throttle > 0) {
    if (currentSpeedMs < -0.2) {
      // Braking while in reverse
      newSpeedMs = Math.min(0, currentSpeedMs + brakeDecel * surfaceGrip * dt);
    } else {
      // Forward drive with gravel penalty if in sand/gravel
      const gravelDrivePenalty = isInGravel ? p.gravelPenalty : 1.0;
      const engineForce = throttle * maxDriveAccel * gravelDrivePenalty;
      const gravelResistance = isInGravel ? 14.0 : 0;
      const netAccel = (engineForce - dragForce - gravelResistance) * surfaceGrip;
      newSpeedMs = currentSpeedMs + netAccel * dt;
    }
  } else if (brake > 0) {
    if (currentSpeedMs > 0.4) {
      // Forward active foot braking
      const gravelBrakeBoost = isInGravel ? 12.0 : 0; // Sand acts as natural brake trap
      const netAccel = (-brakeDecel - dragForce - gravelBrakeBoost) * surfaceGrip;
      newSpeedMs = Math.max(0, currentSpeedMs + netAccel * dt);
    } else {
      // Reverse gear engage
      const netAccel = -reverseAccel * surfaceGrip;
      newSpeedMs = Math.max(reverseMaxSpeedMs, currentSpeedMs + netAccel * dt);
    }
  } else {
    // Engine Braking & Coasting Deceleration (When off-throttle, speed drops smoothly all the way to 0)
    const gravelDrag = isInGravel ? 18.0 : 0; // Heavy loose sand resistance
    const totalCoastDecel = dragForce + engineBrakingVal + gravelDrag;

    if (currentSpeedMs > 0.15) {
      newSpeedMs = Math.max(0, currentSpeedMs - totalCoastDecel * dt);
    } else if (currentSpeedMs < -0.15) {
      newSpeedMs = Math.min(0, currentSpeedMs + (engineBrakingVal + 2.0) * dt);
    } else {
      newSpeedMs = 0;
    }
  }

  // Sand/Gravel Pit speed cap: Deep loose sand bogs the car down to sand crawl (~28 km/h max)
  if (isInGravel && newSpeedMs > 8.0) {
    newSpeedMs = Math.max(8.0, newSpeedMs - dt * 22.0);
  }

  // Pit Lane Speed Limiter (60 km/h or 80 km/h governor)
  if (isInsidePitLane) {
    const pitLimitMs = (trackConfig?.pitLane?.speedLimitKmh || 80) / 3.6;
    if (newSpeedMs > pitLimitMs) {
      newSpeedMs = Math.max(pitLimitMs, newSpeedMs - dt * 14.0);
    }
  }

  // Cap forward top speed
  if (newSpeedMs > maxForwardSpeedMs) newSpeedMs = maxForwardSpeedMs;
  if (isNaN(newSpeedMs)) newSpeedMs = 0;

  // 5. Responsive Steering Math (Scaled per car handling profile)
  const currentYaw = isNaN(currentState.rotation.y) ? 0 : currentState.rotation.y;
  const absSpeedMs = Math.abs(newSpeedMs);
  let turnRate = 0;

  if (absSpeedMs > 0.05) {
    if (absSpeedMs < 11.0) {
      // 0 - 40 km/h: Nimble, allows tight hairpins and turning around
      const rollFactor = Math.min(1.0, absSpeedMs / 0.5);
      turnRate = (2.4 - (absSpeedMs / 11.0) * 0.6) * rollFactor * p.turnRateScale;
    } else if (absSpeedMs < 33.0) {
      // 40 - 120 km/h: Responsive cornering
      const ratio = (absSpeedMs - 11.0) / 22.0;
      turnRate = (1.8 - ratio * 0.7) * p.turnRateScale;
    } else {
      // 120 - 360 km/h: Aerodynamic high-speed stability
      const ratio = Math.min(1.0, (absSpeedMs - 33.0) / 55.0);
      turnRate = Math.max(0.7, (1.1 - ratio * 0.3) * p.turnRateScale);
    }
  }

  // When reversing, steering direction is inverted
  const steerDir = newSpeedMs < -0.1 ? -1 : 1;
  const yawDelta = steering * turnRate * steerDir * dt;
  const newYaw = isNaN(yawDelta) ? currentYaw : currentYaw + yawDelta;

  const isSkidding = Math.abs(steering) > 0.65 && absSpeedMs > 20 && !isOffTrack;

  // 6. Update Car Position along Heading Vector
  const dirX = Math.sin(newYaw);
  const dirZ = Math.cos(newYaw);

  const dx = dirX * newSpeedMs * dt;
  const dz = dirZ * newSpeedMs * dt;

  const curPosX = isNaN(currentState.position.x) ? 0 : currentState.position.x;
  const curPosY = isNaN(currentState.position.y) ? 0.1 : currentState.position.y;
  const curPosZ = isNaN(currentState.position.z) ? 0 : currentState.position.z;

  const nextPosX = curPosX + (isNaN(dx) ? 0 : dx);
  const nextPosZ = curPosZ + (isNaN(dz) ? 0 : dz);

  // Compute exact surface alignment (height, pitch, yaw, roll)
  const align = computeVehicleSurfaceAlignment(
    nextPosX,
    nextPosZ,
    newYaw,
    nearestPoint,
    0.14
  );

  // Snappy suspension: tracks surface with high stability and zero lag penetration
  const newY = curPosY + (align.surfaceY - curPosY) * Math.min(1.0, dt * 35.0);

  const newSpeedKmh = Math.round(newSpeedMs * 3.6);

  return {
    position: {
      x: nextPosX,
      y: isNaN(newY) ? curPosY : newY,
      z: nextPosZ
    },
    rotation: {
      x: align.pitch,
      y: align.yaw,
      z: align.roll + (steering * -0.04)
    },
    velocity: {
      x: dirX * newSpeedMs,
      y: (newY - curPosY) / Math.max(0.001, dt),
      z: dirZ * newSpeedMs
    },
    speedKmh: isNaN(newSpeedKmh) ? 0 : newSpeedKmh,
    throttle,
    brake,
    steering,
    offTrack: isOffTrack,
    skidding: isSkidding,
    carId: currentState.carId || specs.id
  };
}
