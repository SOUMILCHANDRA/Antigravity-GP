export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface TrackNode {
  id: string;
  x: number;
  y: number;
  elevation: number; // in meters (-15 to 40)
  width: number;     // in meters (10 to 40)
  banking?: number;  // in degrees (-20 to 25, default 0)
  runoffWidth?: number; // gravel run-off width in meters (default 8.5)
  locked?: boolean;  // locked against dragging/moving
  cornerName?: string; // e.g. "T1", "Parabolica"
}

export interface TrackConfig {
  id: string;
  name: string;
  nodes: TrackNode[];
  isClosed: boolean;
  defaultWidth: number;
  asphaltColor: string;
  version?: number;
  startIndex?: number; // node index designating start/finish line (default 0)
}

export type EditorTool = 'draw' | 'edit' | 'erase' | 'pan';
export type StudioStage = 'shape' | 'dress' | 'show';

export interface SplinePoint {
  position: Vector3D;
  tangent: Vector3D;
  normal: Vector3D;
  binormal: Vector3D;
  width: number;
  elevation: number;
  banking: number;        // in degrees (-20 to 25)
  runoffWidth: number;    // in meters
  t: number;          // normalized distance [0..1]
  distance: number;   // cumulative distance along spline in meters
}

export interface CarState {
  position: Vector3D;
  rotation: Vector3D; // Euler angles in rad (x, y, z)
  velocity: Vector3D;
  speedKmh: number;
  throttle: number;   // 0..1
  brake: number;      // 0..1
  steering: number;   // -1..1
  offTrack: boolean;
  skidding: boolean;
  carId?: string;
}

export interface LapTelemetry {
  currentLapTime: number;
  lastLapTime: number | null;
  bestLapTime: number | null;
  completedLaps: number;
  maxSpeedKmh: number;
  lapValid: boolean;
}

export type CameraMode = 'chase' | 'cockpit' | 'topdown';
export type AppMode = 'builder' | 'race';
export type AIDifficulty = 'rookie' | 'challenger' | 'legend';

export interface AICompetitorState extends CarState {
  name: string;
  color: string;
  targetSpeedKmh: number;
  lapTelemetry: LapTelemetry;
  hasStartedRace?: boolean;
  difficulty?: AIDifficulty;
  isDrafting?: boolean;
  isOvertaking?: boolean;
  carId?: string;
}

export interface RaceBattleState {
  playerRank: number; // 1 or 2
  aiRank: number;     // 1 or 2
  gapSeconds: number; // Positive if player ahead, negative if AI ahead
  gapMeters: number;  // Distance in meters
}
