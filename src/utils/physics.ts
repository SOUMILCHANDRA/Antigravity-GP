import { CarState, SplinePoint } from '../types/track';
import { getNearestSplinePoint, getTrackSpawnTransform } from './spline';

export interface CarControlInputs {
  throttle: boolean; // Accelerate W / Up
  brake: boolean;    // Brake / Reverse S / Down / Space
  left: boolean;     // Steer Left A / Left
  right: boolean;    // Steer Right D / Right
  reset: boolean;    // Reset R
}

export function createInitialCarState(): CarState {
  return {
    position: { x: 0, y: 0.10, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    speedKmh: 0,
    throttle: 0,
    brake: 0,
    steering: 0,
    offTrack: false,
    skidding: false
  };
}

/**
 * Single Authoritative Reset Function: Resets position, rotation, velocity, speed, throttle, and steering.
 */
export function resetVehicle(carState: CarState, splinePoints: SplinePoint[]): CarState {
  if (splinePoints.length < 2) return createInitialCarState();

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
    skidding: false
  };
}

export function updateCarPhysics(
  currentState: CarState,
  inputs: CarControlInputs,
  splinePoints: SplinePoint[],
  deltaSeconds: number
): CarState {
  // Guard delta time against 0, NaN, or large spikes
  const rawDt = isNaN(deltaSeconds) ? 0.016 : deltaSeconds;
  const dt = Math.max(0.001, Math.min(rawDt, 0.05));

  // 1. Exact Distance to Track Centerline via Segment Projection
  const { point: nearestPoint, distance } = getNearestSplinePoint(
    currentState.position,
    splinePoints
  );

  // Track zones: Asphalt Road -> Kerb -> Sand/Gravel Runoff Trap
  const halfWidth = nearestPoint ? nearestPoint.width / 2 : 7;
  const kerbMargin = 0.65; // 0.65m kerbs
  const isOnTrack = distance <= halfWidth;
  const isOnKerb = distance > halfWidth && distance <= (halfWidth + kerbMargin);
  const isInGravel = distance > (halfWidth + kerbMargin);
  const isOffTrack = isInGravel;

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

  // Performance parameters (1989 McLaren MP4/5 F1 Specs)
  const maxDriveAccel = 42.0;      // m/s^2 (0-100 km/h in 2.5s)
  const brakeDecel = 52.0;         // m/s^2 (F1 Carbon-Ceramic Brakes)
  const reverseAccel = 16.0;       // m/s^2
  const reverseMaxSpeedMs = -12.0; // -43 km/h
  const maxForwardSpeedMs = 95.0;  // 342 km/h
  const dragCoeff = 0.0020;
  const rollingFriction = 1.2;

  // Surface Grip: 1.0 on track, 0.90 on kerbs, 0.45 in loose sand/gravel
  const surfaceGrip = isInGravel ? 0.45 : (isOnKerb ? 0.90 : 1.0);

  // Natural aerodynamic drag
  const dragForce = dragCoeff * currentSpeedMs * currentSpeedMs + rollingFriction;

  let newSpeedMs = currentSpeedMs;

  if (throttle > 0) {
    if (currentSpeedMs < -0.2) {
      // Braking while in reverse
      newSpeedMs = Math.min(0, currentSpeedMs + brakeDecel * surfaceGrip * dt);
    } else {
      // Forward drive with gravel penalty if in sand/gravel
      const gravelDrivePenalty = isInGravel ? 0.35 : 1.0;
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
    // F1 V10 high-compression engine compression braking + rolling resistance
    const engineBraking = 7.5; // m/s^2 natural engine compression braking
    const gravelDrag = isInGravel ? 18.0 : 0; // Heavy loose sand resistance
    const totalCoastDecel = dragForce + engineBraking + gravelDrag;

    if (currentSpeedMs > 0.15) {
      newSpeedMs = Math.max(0, currentSpeedMs - totalCoastDecel * dt);
    } else if (currentSpeedMs < -0.15) {
      newSpeedMs = Math.min(0, currentSpeedMs + (engineBraking + 2.0) * dt);
    } else {
      newSpeedMs = 0;
    }
  }

  // Sand/Gravel Pit speed cap: Deep loose sand bogs the car down to sand crawl (~28 km/h max)
  if (isInGravel && newSpeedMs > 8.0) {
    newSpeedMs = Math.max(8.0, newSpeedMs - dt * 22.0);
  }

  // Cap forward top speed
  if (newSpeedMs > maxForwardSpeedMs) newSpeedMs = maxForwardSpeedMs;
  if (isNaN(newSpeedMs)) newSpeedMs = 0;

  // 5. Responsive Steering Math (High turn rate at low speed, stable at high speed)
  const currentYaw = isNaN(currentState.rotation.y) ? 0 : currentState.rotation.y;
  const absSpeedMs = Math.abs(newSpeedMs);
  let turnRate = 0;

  if (absSpeedMs > 0.05) {
    if (absSpeedMs < 11.0) {
      // 0 - 40 km/h: Nimble, allows tight hairpins and turning around
      const rollFactor = Math.min(1.0, absSpeedMs / 0.5);
      turnRate = (2.4 - (absSpeedMs / 11.0) * 0.6) * rollFactor;
    } else if (absSpeedMs < 33.0) {
      // 40 - 120 km/h: Responsive cornering
      const ratio = (absSpeedMs - 11.0) / 22.0;
      turnRate = 1.8 - ratio * 0.7;
    } else {
      // 120 - 340 km/h: Aerodynamic high-speed stability
      const ratio = Math.min(1.0, (absSpeedMs - 33.0) / 55.0);
      turnRate = Math.max(0.8, 1.1 - ratio * 0.3);
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

  const targetY = nearestPoint ? nearestPoint.position.y : 0;
  const newY = curPosY + (targetY - curPosY) * (dt * 6.0);

  const newSpeedKmh = Math.round(newSpeedMs * 3.6);

  return {
    position: {
      x: curPosX + (isNaN(dx) ? 0 : dx),
      y: isNaN(newY) ? curPosY : newY,
      z: curPosZ + (isNaN(dz) ? 0 : dz)
    },
    rotation: { x: 0, y: newYaw, z: steering * -0.05 },
    velocity: {
      x: dirX * newSpeedMs,
      y: 0,
      z: dirZ * newSpeedMs
    },
    speedKmh: isNaN(newSpeedKmh) ? 0 : newSpeedKmh,
    throttle,
    brake,
    steering,
    offTrack: isOffTrack,
    skidding: isSkidding
  };
}
