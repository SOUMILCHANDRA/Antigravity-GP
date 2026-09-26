export interface CarSpecs {
  id: string;
  name: string;
  shortName: string;
  year: number;
  era: string;
  team: string;
  engine: string;
  powerHp: number;
  weightKg: number;
  topSpeedKmh: number;
  acceleration0to100: number; // seconds
  modelPath: string;
  modelType: 'glb' | 'obj';
  objMtlPath?: string;
  scale: [number, number, number];
  rotationOffset: [number, number, number];
  positionOffset: [number, number, number];
  physics: {
    maxDriveAccel: number;    // m/s^2 forward drive acceleration
    brakeDecel: number;       // m/s^2 foot brake deceleration
    reverseAccel: number;     // m/s^2
    reverseMaxSpeedMs: number;// m/s
    maxForwardSpeedMs: number;// m/s top speed
    dragCoeff: number;        // aero drag coefficient
    rollingFriction: number;  // rolling resistance
    engineBraking: number;    // m/s^2 natural coasting engine braking
    turnRateScale: number;    // steering responsiveness scale
    gripMultiplier: number;   // tire grip multiplier (aero vs mechanical)
    gravelPenalty: number;    // gravel slowdown multiplier
  };
  audio: {
    basePitch: number;
    pitchRange: number;
    idleFreq: number;
    soundType: 'v12_classic' | 'v8_classic' | 'v10_senna' | 'v8_turbo_gt' | 'v6_hybrid';
  };
  liveryColor: string;
  aiDefaultColor: string;
  badge: string;
  description: string;
}

export const CAR_PRESETS: Record<string, CarSpecs> = {
  'ferrari_312_1967': {
    id: 'ferrari_312_1967',
    name: '1967 Ferrari 312 F1',
    shortName: 'Ferrari 312',
    year: 1967,
    era: 'Cigar Tube 3L V12 Era',
    team: 'Scuderia Ferrari',
    engine: '3.0L Colombo 60° V12',
    powerHp: 390,
    weightKg: 530,
    topSpeedKmh: 310,
    acceleration0to100: 3.4,
    modelPath: '/1967_ferrari_312.glb',
    modelType: 'glb',
    scale: [1.0, 1.0, 1.0],
    rotationOffset: [-Math.PI / 2, 0, 0],
    positionOffset: [0, 0.45, 0],
    physics: {
      maxDriveAccel: 33.0,
      brakeDecel: 36.0, // Steel brakes: longer braking zones
      reverseAccel: 14.0,
      reverseMaxSpeedMs: -11.0,
      maxForwardSpeedMs: 86.1, // 310 km/h
      dragCoeff: 0.0014, // Low drag cigar fuselage
      rollingFriction: 1.1,
      engineBraking: 5.2,
      turnRateScale: 0.90, // Classic mechanical drift steering
      gripMultiplier: 0.88, // 0 aero downforce, pure mechanical grip
      gravelPenalty: 0.30
    },
    audio: {
      basePitch: 130,
      pitchRange: 380,
      idleFreq: 75,
      soundType: 'v12_classic'
    },
    liveryColor: '#DC0000',
    aiDefaultColor: '#0055FF',
    badge: 'CLASSIC V12',
    description: 'Zero aerodynamic wings. Pure mechanical grip, screaming 3.0L V12, and progressive high-speed power drifts.'
  },

  'lotus_72d_1972': {
    id: 'lotus_72d_1972',
    name: '1972 Lotus 72D',
    shortName: 'Lotus 72D',
    year: 1972,
    era: 'Early Aero Wedge Era',
    team: 'John Player Team Lotus',
    engine: 'Ford-Cosworth 3.0L DFV V8',
    powerHp: 440,
    weightKg: 560,
    topSpeedKmh: 305,
    acceleration0to100: 2.9,
    modelPath: '/1972_lotus_72d.glb',
    modelType: 'glb',
    scale: [0.218, 0.218, 0.218],
    rotationOffset: [Math.PI / 2, 0, 0],
    positionOffset: [0, 0.02, 0],
    physics: {
      maxDriveAccel: 38.0,
      brakeDecel: 44.0,
      reverseAccel: 15.0,
      reverseMaxSpeedMs: -12.0,
      maxForwardSpeedMs: 84.7, // 305 km/h
      dragCoeff: 0.0017,
      rollingFriction: 1.2,
      engineBraking: 6.2,
      turnRateScale: 1.15, // Extremely agile wedge chassis
      gripMultiplier: 0.96,
      gravelPenalty: 0.32
    },
    audio: {
      basePitch: 120,
      pitchRange: 340,
      idleFreq: 68,
      soundType: 'v8_classic'
    },
    liveryColor: '#D4AF37', // Gold & Black
    aiDefaultColor: '#00E5FF',
    badge: 'JPS WEDGE',
    description: 'Iconic Colin Chapman wedge design with inboard brakes. Razor-sharp mechanical turn-in with throaty Cosworth DFV V8.'
  },

  'mclaren_mp45_1989': {
    id: 'mclaren_mp45_1989',
    name: '1989 McLaren MP4/5',
    shortName: 'McLaren MP4/5',
    year: 1989,
    era: 'Senna-Prost V10 Peak Era',
    team: 'McLaren Honda',
    engine: 'Honda RA109E 3.5L V10',
    powerHp: 675,
    weightKg: 500,
    topSpeedKmh: 342,
    acceleration0to100: 2.4,
    modelPath: '/mclaren_mp45.glb',
    modelType: 'glb',
    scale: [0.60, 0.60, 0.60],
    rotationOffset: [0, 0, 0],
    positionOffset: [0, 0.0, 0],
    physics: {
      maxDriveAccel: 44.0,
      brakeDecel: 52.0, // High-performance carbon-carbon brakes
      reverseAccel: 16.0,
      reverseMaxSpeedMs: -12.0,
      maxForwardSpeedMs: 95.0, // 342 km/h
      dragCoeff: 0.0020,
      rollingFriction: 1.2,
      engineBraking: 7.5,
      turnRateScale: 1.05,
      gripMultiplier: 1.05, // Heavy aerodynamic wing downforce
      gravelPenalty: 0.35
    },
    audio: {
      basePitch: 145,
      pitchRange: 420,
      idleFreq: 82,
      soundType: 'v10_senna'
    },
    liveryColor: '#E10600',
    aiDefaultColor: '#00E5FF',
    badge: 'LEGEND V10',
    description: '12,800 RPM Honda V10 monster. Monumental aerodynamic downforce, fierce carbon-carbon braking, and Senna-grade agility.'
  },

  'ferrari_f40_1989': {
    id: 'ferrari_f40_1989',
    name: '1989 Ferrari F40 Competizione',
    shortName: 'Ferrari F40 LM',
    year: 1989,
    era: 'Le Mans Twin-Turbo GT Era',
    team: 'Ferrari Corse Clienti',
    engine: 'Tipo F120B 2.9L Twin-Turbo V8',
    powerHp: 700,
    weightKg: 1050,
    topSpeedKmh: 367,
    acceleration0to100: 3.1,
    modelPath: '/1989_ferrari_f40_competizione.glb',
    modelType: 'glb',
    scale: [1.0, 1.0, 1.0],
    rotationOffset: [0, 0, 0],
    positionOffset: [0, 0.0, 0],
    physics: {
      maxDriveAccel: 42.0,
      brakeDecel: 40.0, // Heavier GT chassis inertia
      reverseAccel: 14.0,
      reverseMaxSpeedMs: -12.0,
      maxForwardSpeedMs: 101.9, // 367 km/h straight line rocket
      dragCoeff: 0.0016, // Low GT drag coefficient
      rollingFriction: 1.3,
      engineBraking: 6.0,
      turnRateScale: 0.86, // Realistic supercar mass inertia in chicanes
      gripMultiplier: 0.94,
      gravelPenalty: 0.40
    },
    audio: {
      basePitch: 110,
      pitchRange: 360,
      idleFreq: 64,
      soundType: 'v8_turbo_gt'
    },
    liveryColor: '#FF0022',
    aiDefaultColor: '#FFD700',
    badge: 'TWIN-TURBO GT',
    description: '700 hp brutal twin-turbocharged supercar. Extreme straight-line acceleration and high top speed with genuine GT inertia.'
  },

  'ferrari_f1_2014': {
    id: 'ferrari_f1_2014',
    name: '2014 Ferrari F14 T',
    shortName: 'Ferrari F14 T',
    year: 2014,
    era: 'V6 Turbo Hybrid Era',
    team: 'Scuderia Ferrari',
    engine: '1.6L V6 Turbo Hybrid + ERS',
    powerHp: 760,
    weightKg: 691,
    topSpeedKmh: 355,
    acceleration0to100: 2.2,
    modelPath: '/2014_ferrari_f1.glb',
    modelType: 'glb',
    scale: [1.0, 1.0, 1.0],
    rotationOffset: [0, 0, 0],
    positionOffset: [0, 0.0, 0],
    physics: {
      maxDriveAccel: 48.0, // Instant electric ERS torque punch
      brakeDecel: 56.0, // Fly-by-wire carbon ceramic + ERS regeneration
      reverseAccel: 16.0,
      reverseMaxSpeedMs: -13.0,
      maxForwardSpeedMs: 98.6, // 355 km/h
      dragCoeff: 0.0019,
      rollingFriction: 1.2,
      engineBraking: 8.2,
      turnRateScale: 1.14, // Modern high downforce aerodynamic package
      gripMultiplier: 1.10,
      gravelPenalty: 0.35
    },
    audio: {
      basePitch: 135,
      pitchRange: 390,
      idleFreq: 78,
      soundType: 'v6_hybrid'
    },
    liveryColor: '#C00000',
    aiDefaultColor: '#00E5FF',
    badge: 'HYBRID TURBO',
    description: 'Instant ERS electric torque-fill out of corners, massive modern aerodynamic downforce, and ultra-short braking zones.'
  }
};

export const DEFAULT_PLAYER_CAR_ID = 'mclaren_mp45_1989';
export const DEFAULT_AI_CAR_ID = 'ferrari_f1_2014';
