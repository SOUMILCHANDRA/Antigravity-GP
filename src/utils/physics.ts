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

  // Road half-width + kerb (kerbs extend ~0.45m outside asphalt)
  const halfWidth = nearestPoint ? nearestPoint.width / 2 : 7;
  // Drivable across the full asphalt and kerb width
  const isOffTrack = distance > (halfWidth + 0.5);

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

  // Performance parameters
  const maxDriveAccel = 40.0;      // m/s^2 (0-100 km/h in 2.6s)
  const brakeDecel = 50.0;         // m/s^2
  const reverseAccel = 16.0;       // m/s^2
  const reverseMaxSpeedMs = -12.0; // -43 km/h
  const maxForwardSpeedMs = 95.0;  // 342 km/h
  const dragCoeff = 0.0018;
  const rollingFriction = 1.0;

  // Grip: 0.80 on grass (traction to steer and re-enter easily), 1.0 on track
  const surfaceGrip = isOffTrack ? 0.80 : 1.0;
  // Natural rolling resistance and aerodynamic drag
  const dragForce = dragCoeff * currentSpeedMs * currentSpeedMs + rollingFriction;

  let newSpeedMs = currentSpeedMs;

  if (throttle > 0) {
    if (currentSpeedMs < -0.2) {
      // Braking while in reverse
      newSpeedMs = Math.min(0, currentSpeedMs + brakeDecel * surfaceGrip * dt);
    } else {
      // Forward drive
      const engineForce = throttle * maxDriveAccel;
      const netAccel = (engineForce - dragForce) * surfaceGrip;
      newSpeedMs = currentSpeedMs + netAccel * dt;
    }
  } else if (brake > 0) {
    if (currentSpeedMs > 0.4) {
      // Forward braking
      const netAccel = (-brakeDecel - dragForce) * surfaceGrip;
      newSpeedMs = Math.max(0, currentSpeedMs + netAccel * dt);
    } else {
      // Reverse gear engage
      const netAccel = -reverseAccel * surfaceGrip;
      newSpeedMs = Math.max(reverseMaxSpeedMs, currentSpeedMs + netAccel * dt);
    }
  } else {
    // Coasting deceleration
    const coastDecel = (dragForce + rollingFriction * 1.5) * (isOffTrack ? 1.8 : 1.0);
    if (currentSpeedMs > 0.15) {
      newSpeedMs = Math.max(0, currentSpeedMs - coastDecel * dt);
    } else if (currentSpeedMs < -0.15) {
      newSpeedMs = Math.min(0, currentSpeedMs + coastDecel * dt);
    } else {
      newSpeedMs = 0;
    }
  }

  // Smooth grass top speed (levels off naturally without artificial brake snaps)
  if (isOffTrack && newSpeedMs > 38.0) {
    newSpeedMs = Math.max(38.0, newSpeedMs - dt * 6.0);
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
