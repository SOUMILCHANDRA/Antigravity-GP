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

export interface MapUnderlayConfig {
  imageUrl: string;
  opacity: number;       // 0 to 1
  visible: boolean;
  locked: boolean;
  x: number;             // world X
  y: number;             // world Z (2D Y)
  scale: number;         // meters per pixel or scale multiplier
  rotation: number;      // degrees
  calibrationPoints?: [Vector2D, Vector2D];
  calibrationDistanceMeters?: number;
}

export interface VenueFacility {
  id: string;
  type: 'grandstand' | 'pit_building' | 'paddock' | 'gantry' | 'marshal_post' | 'tv_camera' | 'tire_barrier' | 'armco' | 'tree' | 'sponsor_board';
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
  splineT?: number;
  side?: 'left' | 'right' | 'free';
  seats?: number;
  label?: string;
}

export interface PitLaneConfig {
  enabled: boolean;
  entryT: number;          // spline t where pit lane diverges
  exitT: number;           // spline t where pit lane merges back
  speedLimitKmh: number;   // default: 80 km/h
  pitBoxes: number;        // number of stalls
  side: 'left' | 'right';
  width: number;           // pit road width (default: 8m)
}

export type CurbStyle = 'red_white' | 'blue_yellow' | 'green_white' | 'monza_black_yellow' | 'flat_kerb';
export type AsphaltStyle = 'modern_f1' | 'classic_weathered' | 'street_concrete' | 'night_circuit';
export type RunoffStyle = 'gravel_trap' | 'asphalt_stripes' | 'grass_verge';

export interface TrackDressingConfig {
  curbStyle: CurbStyle;
  asphaltStyle: AsphaltStyle;
  runoffStyle: RunoffStyle;
  sponsorName?: string;
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
  crossingType?: 'flat' | 'bridge' | 'tunnel';
  facilities?: VenueFacility[];
  pitLane?: PitLaneConfig;
  dressing?: TrackDressingConfig;
  underlay?: MapUnderlayConfig;
  venueStyle?: 'gp' | 'club' | 'street' | 'karting';
}

export type EditorTool = 'draw' | 'edit' | 'erase' | 'pan';
export type StudioStage = 'shape' | 'dress' | 'show';
export type EditorViewMode = '2d' | 'split' | '3d';

export interface SplinePoint {
  position: Vector3D;
  tangent: Vector3D;
  normal: Vector3D;
  binormal: Vector3D;
  width: number;
  elevation: number;
  /** Automatically generated road cover for underpasses or terrain tunnels. */
  tunnel?: boolean;
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
