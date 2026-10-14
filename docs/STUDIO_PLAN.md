# Antigravity GP: Track Studio Architecture & Evolution Plan (Shape → Dress → Show)

This document formalizes the architecture, data models, consumption pipelines, backwards-compatibility migration strategy, and phased evolution plan to advance Antigravity GP into a professional three-stage track engineering studio (Shape → Dress → Show), akin to modern generative circuit design platforms.

---

## 1. Current Track Data Model & Consumers

### Current Model (`src/types/track.ts`)

```typescript
export interface TrackNode {
  id: string;
  x: number;
  y: number;
  elevation: number; // in meters (-15 to 40)
  width: number;     // in meters (10 to 40)
}

export interface TrackConfig {
  id: string;
  name: string;
  nodes: TrackNode[];
  isClosed: boolean;
  defaultWidth: number;
  asphaltColor: string;
}

export interface SplinePoint {
  position: Vector3D;
  tangent: Vector3D;
  normal: Vector3D;
  binormal: Vector3D;
  width: number;
  elevation: number;
  t: number;          // normalized distance [0..1]
  distance: number;   // cumulative distance along spline in meters
}
```

### Consumption Map

1. **Spline & Geometry Generator (`src/utils/spline.ts`)**:
   - `buildTrackCurve(nodes, isClosed)`: Maps `(node.x, node.elevation, node.y)` to 3D Catmull-Rom spline vectors.
   - `sampleSplinePoints(curve, nodes, divisions=350)`: Samples positions, computes local Frenet/Darboux frames (`tangent`, `binormal`, `normal`), linearly interpolating `width` and `elevation` across nodes.
   - `getTrackSpawnTransform(splinePoints)`: Calculates grid pole position and heading yaw angle based on sample `0 -> sample 2`.
   - `getNearestSplinePoint(carPos, splinePoints)`: Computes segment projections, Euclidean distance to centerline, signed lateral offset, and segment percentage `t`.
   - `checkFinishLineCrossing(prevPos, currPos, startPoint)`: Gate intersection math on start/finish plane.

2. **2D Editor Canvas (`src/components/TrackEditor/EditorCanvas.tsx`)**:
   - Renders 2D interactive canvas: coordinate transformation, pan/zoom, grid, road width outline, kerb edges, control nodes, and drag interactions.

3. **3D Mesh Rendering (`src/components/Race3D/TrackMesh.tsx`)**:
   - Generates 5 distinct, non-overlapping vertex buffer ribbons:
     - Asphalt road surface (`-halfWidth` to `+halfWidth`)
     - Left & right kerb strips ($0.65\text{m}$, red/white)
     - Left & right sand/gravel traps ($8.5\text{m}$, friction cap $28\text{ km/h}$)
   - Start/finish gantry arch & checkered texture banner.

4. **Physics Engine (`src/utils/physics.ts`)**:
   - Consumes `splinePoints` via `getNearestSplinePoint(carPos, splinePoints)`.
   - Calculates dynamic road width boundaries ($100\%$ tarmac, $90\%$ kerbs, $28\text{ km/h}$ gravel trap slowdown & lap invalidation).
   - Follows track elevation along spline Y.

5. **AI Competitor (`src/utils/aiCompetitor.ts`)**:
   - Uses `splinePoints` for circumcircle curvature calculation (`computeCurvatureRadius`).
   - Uses `racingLinePoints` (`src/utils/racingLine.ts`) for optimal apex offsets.
   - Pure Pursuit steering and curvature feedforward braking zones.

---

## 2. Proposed Extended Track Data Model

The data model is extended backwards-compatibly. All new fields are optional with strict fallback defaults.

```typescript
export interface TrackNode {
  id: string;
  x: number;
  y: number;
  elevation?: number;      // in meters (-15 to 50, default: 0)
  width?: number;          // in meters (10 to 40, fallback: track.defaultWidth)
  banking?: number;        // banking angle in degrees (-20 to +25, default: 0)
  runoffWidth?: number;    // run-off gravel trap width (meters, default: 8.5)
  locked?: boolean;        // whether point position is locked against accidental edits
  cornerName?: string;     // optional label e.g., "Turn 1", "Curva Grande"
}

export interface VenueFacility {
  id: string;
  type: 'grandstand' | 'pit_building' | 'paddock' | 'gantry' | 'marshal_post' | 'tv_camera' | 'medical_center' | 'tire_barrier' | 'armco' | 'tree' | 'sponsor_board';
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
  splineT?: number;        // anchor relative to track spline distance
  side?: 'left' | 'right' | 'free';
  seats?: number;
}

export interface PitLaneConfig {
  enabled: boolean;
  entryT: number;          // spline t where pit lane diverges
  exitT: number;           // spline t where pit lane merges back
  speedLimitKmh: number;   // default: 80 km/h
  pitBoxes: number;        // number of stalls
  side: 'left' | 'right';
  pathNodes?: TrackNode[]; // manual spline override if customized
}

export interface TrackConfig {
  id: string;
  name: string;
  nodes: TrackNode[];
  isClosed: boolean;
  defaultWidth: number;
  asphaltColor: string;
  // Studio Extensions (Backwards-Compatible)
  version?: number;                     // schema version, e.g. 2
  startIndex?: number;                  // designated start/finish node index (default: 0)
  crossingType?: 'flat' | 'bridge' | 'tunnel'; // figure-8 / intersection style
  facilities?: VenueFacility[];         // Dress stage
  pitLane?: PitLaneConfig;              // Dress stage
  venueStyle?: 'gp' | 'club' | 'street' | 'karting';
  realScaleMetersPerPixel?: number;     // for map tracing calibration
}

export interface SplinePoint {
  position: Vector3D;
  tangent: Vector3D;
  normal: Vector3D;
  binormal: Vector3D;
  width: number;
  elevation: number;
  banking: number;         // in degrees
  runoffWidth: number;     // in meters
  t: number;
  distance: number;
}
```

### Backwards-Compatibility Normalizer
Old circuits loaded without these fields will pass through a zero-cost normalizer:
- `elevation ?? 0`
- `width ?? track.defaultWidth`
- `banking ?? 0`
- `runoffWidth ?? 8.5`
- `startIndex ?? 0`
- `facilities ?? []`

---

## 3. Single Source of Truth Guarantee

Physics, AI, and Rendering will all sample from `sampleSplinePoints(curve, nodes)`.
- **Rendering (`TrackMesh.tsx`)**: Re-orients vertex strips along `binormal` tilted by `banking` angle in radians (`tan(banking)` / rotation around `tangent`).
- **Physics (`physics.ts`)**: Banking contributes to lateral grip $g \cdot \sin(\text{banking})$ and normal contact force $g \cdot \cos(\text{banking})$.
- **AI Competitor (`aiCompetitor.ts`)**: Elevated corner banking increases effective lateral acceleration limit $a_{\text{lat}} = \sqrt{\mu g R / (1 - \mu \tan\theta)}$, enabling realistic high-speed banked oval/carousel cornering.

---

## 4. Implementation Stages Roadmap

### Stage 1: Editor Core (Shape Mode) — *Focus of current task*
- **Tool system**: Draw (`P`), Edit (`E`), Erase (`X`), Pan (`Space` / right-click drag).
- **Edit Interactions**:
  - Drag single or multi-selected nodes.
  - Double-click track edge to insert a node at the projected spline position.
  - Right-click / context action or Delete key to delete nodes.
  - Arrow key nudges: $1\text{m}$ (default) and $10\text{m}$ (`Shift + Arrow`).
- **Multi-Selection**: Rubber-band selection box, Shift-click to add/remove, translate entire group.
- **Node Locking**: Toggle lock on nodes to prevent movement.
- **History**: Full Undo/Redo stack (`Ctrl+Z`, `Ctrl+Shift+Z`) with dedicated History Panel listing actions.
- **Viewport Navigation**: Zoom-to-fit (`F`), WASD panning, wheel zoom, snap grid toggle.
- **Angle Snapping**: `Shift + Click` locks straight line angles to $15^\circ$ increments.
- **Start/Finish Positioning**: Move start/finish line to any selected node (reordering node sequence seamlessly).

### Stage 2: Per-Point Geometry
- Point inspector panel for width, elevation, banking, and runoff width.
- Automatic curvature analysis and numbered corner tags.
- Banking applied to mesh orientation and physics.

### Stage 3: Templates and Map Tracing
- Preset circuit architectures (Loop, GP, Street, Oval, Figure-8, Technical, Roval, Kart, Hill Climb).
- Real-world map underlay tracing with meter calibration tool.

### Stage 4: Dress (Venue & Facilities)
- Auto pit lane generation with pit speed limit.
- Facility library: Grandstands, pit buildings, TV cameras, tire barriers, sponsor boards.

### Stage 5: Show (Analysis, Telemetry & Headless Sim)
- Headless fast lap time estimation.
- Playback & flythrough camera.
- Circuit safety and grade analysis.

### Stage 6: View System & Performance Polish
- 2D / 3D / Split views.
- Keyboard overlay.
- Low-memory profiling and instancing verification.
