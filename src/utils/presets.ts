import { TrackConfig, TrackNode } from '../types/track';

export const EMPTY_TRACK: TrackConfig = {
  id: 'user-circuit',
  name: 'My Custom Circuit',
  nodes: [],
  isClosed: false,
  defaultWidth: 14,
  asphaltColor: '#1C2129',
  version: 2
};

export const GRAND_PRIX_INTERNATIONAL: TrackConfig = {
  id: 'preset-gp-international',
  name: 'Grand Prix International',
  isClosed: true,
  defaultWidth: 14,
  asphaltColor: '#1C2129',
  version: 2,
  startIndex: 0,
  dressing: {
    curbStyle: 'red_white',
    asphaltStyle: 'modern_f1',
    runoffStyle: 'gravel_trap',
    sponsorName: 'ANTIGRAVITY GRAND PRIX'
  },
  nodes: [
    { id: 'gp-1', x: -350, y: 150, elevation: 0, width: 15, banking: 0, cornerName: 'Start / Finish Straight' },
    { id: 'gp-2', x: -100, y: 150, elevation: 2, width: 15, banking: 0, cornerName: 'Pit Straight' },
    { id: 'gp-3', x: 80, y: 150, elevation: 3, width: 14, banking: 2, cornerName: 'Turn 1 (Braking)' },
    { id: 'gp-4', x: 150, y: 100, elevation: 4, width: 13, banking: 4, cornerName: 'Turn 2 (Senna S)' },
    { id: 'gp-5', x: 130, y: 20, elevation: 3, width: 14, banking: 3, cornerName: 'Turn 3 (Curva do Sol)' },
    { id: 'gp-6', x: 20, y: -40, elevation: 1, width: 15, banking: 0, cornerName: 'Reta Oposta' },
    { id: 'gp-7', x: -160, y: -80, elevation: 0, width: 15, banking: 0, cornerName: 'Back Straight' },
    { id: 'gp-8', x: -260, y: -100, elevation: -2, width: 13, banking: 6, cornerName: 'Descida do Lago (T4)' },
    { id: 'gp-9', x: -280, y: -180, elevation: -4, width: 13, banking: 5, cornerName: 'Turn 5' },
    { id: 'gp-10', x: -200, y: -240, elevation: -2, width: 14, banking: 4, cornerName: 'Ferradura (T6)' },
    { id: 'gp-11', x: -70, y: -230, elevation: 2, width: 14, banking: 3, cornerName: 'Turn 7' },
    { id: 'gp-12', x: 40, y: -200, elevation: 5, width: 12, banking: 4, cornerName: 'Laranjinha Hairpin (T8)' },
    { id: 'gp-13', x: 60, y: -110, elevation: 4, width: 13, banking: 3, cornerName: 'Pinheirinho (T9)' },
    { id: 'gp-14', x: -30, y: -80, elevation: 2, width: 14, banking: 2, cornerName: 'Bico de Pato (T10)' },
    { id: 'gp-15', x: -100, y: 0, elevation: 1, width: 14, banking: 4, cornerName: 'Mergulho (T11)' },
    { id: 'gp-16', x: -240, y: 50, elevation: 0, width: 15, banking: 8, cornerName: 'Junção (T12)' },
    { id: 'gp-17', x: -360, y: 80, elevation: 0, width: 16, banking: 10, cornerName: 'Arquibancadas (T13 Sweeper)' }
  ]
};

export const TRI_OVAL_SUPERSPEEDWAY: TrackConfig = {
  id: 'preset-tri-oval',
  name: 'Daytona Superspeedway (Tri-Oval)',
  isClosed: true,
  defaultWidth: 18,
  asphaltColor: '#1A212B',
  version: 2,
  startIndex: 0,
  dressing: {
    curbStyle: 'blue_yellow',
    asphaltStyle: 'modern_f1',
    runoffStyle: 'asphalt_stripes',
    sponsorName: 'SUPERSPEEDWAY 500'
  },
  nodes: [
    { id: 'ov-1', x: -200, y: 160, elevation: 0, width: 18, banking: 4, cornerName: 'Start / Finish' },
    { id: 'ov-2', x: 0, y: 175, elevation: 0, width: 18, banking: 4, cornerName: 'Tri-Oval Dogleg' },
    { id: 'ov-3', x: 200, y: 160, elevation: 1, width: 18, banking: 8, cornerName: 'Turn 1 Entry' },
    { id: 'ov-4', x: 380, y: 100, elevation: 2, width: 19, banking: 21, cornerName: 'Turn 1 High Bank' },
    { id: 'ov-5', x: 420, y: -20, elevation: 2, width: 19, banking: 22, cornerName: 'Turn 2 Apex' },
    { id: 'ov-6', x: 340, y: -130, elevation: 1, width: 18, banking: 18, cornerName: 'Turn 2 Exit' },
    { id: 'ov-7', x: 100, y: -170, elevation: 0, width: 18, banking: 2, cornerName: 'Superstretch Back Straight' },
    { id: 'ov-8', x: -150, y: -170, elevation: 0, width: 18, banking: 2, cornerName: 'Backstretch' },
    { id: 'ov-9', x: -350, y: -130, elevation: 1, width: 18, banking: 18, cornerName: 'Turn 3 High Bank' },
    { id: 'ov-10', x: -430, y: -20, elevation: 2, width: 19, banking: 22, cornerName: 'Turn 4 Apex' },
    { id: 'ov-11', x: -380, y: 90, elevation: 1, width: 18, banking: 16, cornerName: 'Turn 4 Exit' }
  ]
};

export const MONACO_STREET_CIRCUIT: TrackConfig = {
  id: 'preset-monaco-street',
  name: 'Circuit de Monaco (Street)',
  isClosed: true,
  defaultWidth: 11,
  asphaltColor: '#222834',
  version: 2,
  startIndex: 0,
  dressing: {
    curbStyle: 'red_white',
    asphaltStyle: 'street_concrete',
    runoffStyle: 'asphalt_stripes',
    sponsorName: 'GRAND PRIX DE MONACO'
  },
  nodes: [
    { id: 'mc-1', x: -220, y: 80, elevation: 0, width: 12, banking: 0, cornerName: 'Boulevard Albert 1er' },
    { id: 'mc-2', x: -80, y: 85, elevation: 1, width: 11, banking: 2, cornerName: 'Sainte-Dévote (T1)' },
    { id: 'mc-3', x: 0, y: 40, elevation: 8, width: 11, banking: 0, cornerName: 'Beau Rivage Climb' },
    { id: 'mc-4', x: 50, y: -40, elevation: 14, width: 10, banking: 3, cornerName: 'Massenet (T2)' },
    { id: 'mc-5', x: 30, y: -110, elevation: 15, width: 11, banking: -2, cornerName: 'Casino Square (T3)' },
    { id: 'mc-6', x: -30, y: -140, elevation: 12, width: 10, banking: 2, cornerName: 'Mirabeau Haute (T4)' },
    { id: 'mc-7', x: -100, y: -145, elevation: 8, width: 9.5, banking: 4, cornerName: 'Grand Hotel Hairpin (T5)' },
    { id: 'mc-8', x: -120, y: -110, elevation: 4, width: 10, banking: 2, cornerName: 'Mirabeau Bas (T6)' },
    { id: 'mc-9', x: -140, y: -60, elevation: 1, width: 11, banking: 0, cornerName: 'Portier (T7)' },
    { id: 'mc-10', x: -90, y: -10, elevation: 0, width: 13, banking: 0, cornerName: 'Tunnel Straight' },
    { id: 'mc-11', x: 20, y: 15, elevation: 0, width: 12, banking: 0, cornerName: 'Tunnel Exit' },
    { id: 'mc-12', x: 70, y: 30, elevation: 0, width: 10, banking: 0, cornerName: 'Nouvelle Chicane (T8)' },
    { id: 'mc-13', x: 60, y: 65, elevation: 0, width: 11, banking: 2, cornerName: 'Tabac (T9)' },
    { id: 'mc-14', x: -20, y: 60, elevation: 0, width: 11, banking: 2, cornerName: 'Louis Chiron (T10)' },
    { id: 'mc-15', x: -90, y: 55, elevation: 0, width: 10, banking: 0, cornerName: 'Piscine Swimming Pool' },
    { id: 'mc-16', x: -160, y: 40, elevation: 0, width: 9.5, banking: 3, cornerName: 'La Rascasse (T11)' },
    { id: 'mc-17', x: -190, y: 60, elevation: 0, width: 10, banking: 1, cornerName: 'Anthony Noghès (T12)' }
  ]
};

export const SUZUKA_FIGURE_EIGHT: TrackConfig = {
  id: 'preset-suzuka-figure8',
  name: 'Suzuka International (Figure-8)',
  isClosed: true,
  defaultWidth: 14,
  asphaltColor: '#181E27',
  version: 2,
  startIndex: 0,
  crossingType: 'bridge',
  dressing: {
    curbStyle: 'red_white',
    asphaltStyle: 'modern_f1',
    runoffStyle: 'gravel_trap',
    sponsorName: 'JAPANESE GRAND PRIX'
  },
  nodes: [
    { id: 'sz-1', x: -240, y: 220, elevation: 0, width: 15, banking: 0, cornerName: 'Pit Straight' },
    { id: 'sz-2', x: -100, y: 230, elevation: 1, width: 15, banking: 3, cornerName: 'First Corner (T1)' },
    { id: 'sz-3', x: -40, y: 170, elevation: 2, width: 13, banking: 5, cornerName: 'S-Curves (T3)' },
    { id: 'sz-4', x: 10, y: 140, elevation: 4, width: 13, banking: 4, cornerName: 'S-Curves (T4)' },
    { id: 'sz-5', x: -20, y: 90, elevation: 5, width: 13, banking: 5, cornerName: 'S-Curves (T5)' },
    { id: 'sz-6', x: 40, y: 40, elevation: 7, width: 13, banking: 4, cornerName: 'Dunlop Curve (T6)' },
    { id: 'sz-7', x: 70, y: -40, elevation: 8, width: 12, banking: 3, cornerName: 'Degner 1 (T7)' },
    { id: 'sz-8', x: 120, y: -60, elevation: 7, width: 11, banking: 2, cornerName: 'Degner 2 (T8)' },
    { id: 'sz-9', x: 100, y: -130, elevation: 0, width: 14, banking: 0, cornerName: 'Underpass Crossing' },
    { id: 'sz-10', x: 120, y: -220, elevation: 2, width: 12, banking: 5, cornerName: 'Hairpin (T11)' },
    { id: 'sz-11', x: 40, y: -240, elevation: 4, width: 14, banking: 4, cornerName: '200R Sweeper' },
    { id: 'sz-12', x: -60, y: -220, elevation: 6, width: 13, banking: 6, cornerName: 'Spoon Curve 1 (T13)' },
    { id: 'sz-13', x: -140, y: -190, elevation: 7, width: 13, banking: 7, cornerName: 'Spoon Curve 2 (T14)' },
    { id: 'sz-14', x: -100, y: -110, elevation: 8, width: 15, banking: 1, cornerName: 'Back Straight Entry' },
    { id: 'sz-15', x: 60, y: -130, elevation: 9, width: 15, banking: 1, cornerName: 'Crossover Bridge (Upper)' },
    { id: 'sz-16', x: 140, y: -70, elevation: 8, width: 15, banking: 0, cornerName: 'Back Straight High-Speed' },
    { id: 'sz-17', x: 180, y: 40, elevation: 4, width: 15, banking: 8, cornerName: '130R (Flat-Out T15)' },
    { id: 'sz-18', x: 110, y: 150, elevation: 1, width: 12, banking: 0, cornerName: 'Casio Triangle Chicane' },
    { id: 'sz-19', x: -80, y: 200, elevation: 0, width: 14, banking: 2, cornerName: 'Final Corner' }
  ]
};

export const MOUNT_PANORAMA_HILLCLIMB: TrackConfig = {
  id: 'preset-bathurst-mountain',
  name: 'Mount Panorama (Bathurst)',
  isClosed: true,
  defaultWidth: 12,
  asphaltColor: '#1A222C',
  version: 2,
  startIndex: 0,
  dressing: {
    curbStyle: 'green_white',
    asphaltStyle: 'classic_weathered',
    runoffStyle: 'gravel_trap',
    sponsorName: 'BATHURST 1000'
  },
  nodes: [
    { id: 'bt-1', x: -350, y: 140, elevation: 0, width: 14, banking: 0, cornerName: 'Pit Straight' },
    { id: 'bt-2', x: -120, y: 140, elevation: 0, width: 13, banking: 3, cornerName: 'Hell Corner (T1)' },
    { id: 'bt-3', x: 100, y: 110, elevation: 8, width: 13, banking: 1, cornerName: 'Mountain Straight Climb' },
    { id: 'bt-4', x: 260, y: 70, elevation: 18, width: 11, banking: 6, cornerName: 'Griffin\'s Bend (T2)' },
    { id: 'bt-5', x: 280, y: -20, elevation: 28, width: 10, banking: 7, cornerName: 'The Cutting (T3 Steep)' },
    { id: 'bt-6', x: 230, y: -90, elevation: 36, width: 10, banking: 4, cornerName: 'Reid Park (T4)' },
    { id: 'bt-7', x: 140, y: -130, elevation: 42, width: 11, banking: 5, cornerName: 'Sulman Park (T5)' },
    { id: 'bt-8', x: 30, y: -150, elevation: 45, width: 11, banking: 3, cornerName: 'McPhillamy Park (Crest)' },
    { id: 'bt-9', x: -80, y: -130, elevation: 43, width: 10, banking: 0, cornerName: 'Skyline (The Drop)' },
    { id: 'bt-10', x: -160, y: -90, elevation: 28, width: 9.5, banking: 5, cornerName: 'The Esses (Downhill)' },
    { id: 'bt-11', x: -190, y: -40, elevation: 18, width: 9.5, banking: 8, cornerName: 'The Dipper' },
    { id: 'bt-12', x: -180, y: 20, elevation: 10, width: 11, banking: 5, cornerName: 'Forrest\'s Elbow' },
    { id: 'bt-13', x: -240, y: 60, elevation: 4, width: 14, banking: 0, cornerName: 'Conrod Straight' },
    { id: 'bt-14', x: -320, y: 90, elevation: 1, width: 12, banking: 2, cornerName: 'The Chase Chicane' }
  ]
};

export const TECHNICAL_ARENA: TrackConfig = {
  id: 'preset-technical-arena',
  name: 'Technical Arena (Hungaroring Style)',
  isClosed: true,
  defaultWidth: 13,
  asphaltColor: '#1F2531',
  version: 2,
  startIndex: 0,
  dressing: {
    curbStyle: 'monza_black_yellow',
    asphaltStyle: 'modern_f1',
    runoffStyle: 'asphalt_stripes',
    sponsorName: 'CHAMPIONSHIP ARENA'
  },
  nodes: [
    { id: 'ta-1', x: -260, y: 150, elevation: 0, width: 15, banking: 0, cornerName: 'Main Straight' },
    { id: 'ta-2', x: -60, y: 160, elevation: -2, width: 13, banking: 5, cornerName: 'Turn 1 Hairpin' },
    { id: 'ta-3', x: -30, y: 70, elevation: 2, width: 13, banking: 4, cornerName: 'Turn 2 Off-Camber' },
    { id: 'ta-4', x: 40, y: 10, elevation: 5, width: 14, banking: 2, cornerName: 'Turn 3 Sweeper' },
    { id: 'ta-5', x: 130, y: -20, elevation: 8, width: 12, banking: 5, cornerName: 'Turn 4 Fast Blind Crest' },
    { id: 'ta-6', x: 200, y: -90, elevation: 6, width: 12, banking: 6, cornerName: 'Turn 5 Long Radius' },
    { id: 'ta-7', x: 140, y: -160, elevation: 3, width: 11, banking: 0, cornerName: 'Turn 6/7 Chicane' },
    { id: 'ta-8', x: 40, y: -150, elevation: 1, width: 12, banking: 4, cornerName: 'Turn 8 Left' },
    { id: 'ta-9', x: -20, y: -190, elevation: 0, width: 12, banking: 3, cornerName: 'Turn 9 Right' },
    { id: 'ta-10', x: -90, y: -170, elevation: 2, width: 13, banking: 2, cornerName: 'Turn 10 Flat' },
    { id: 'ta-11', x: -160, y: -140, elevation: 4, width: 12, banking: 4, cornerName: 'Turn 11 Sweeper' },
    { id: 'ta-12', x: -210, y: -70, elevation: 3, width: 12, banking: 5, cornerName: 'Turn 12 90-Degree' },
    { id: 'ta-13', x: -250, y: 10, elevation: 1, width: 13, banking: 4, cornerName: 'Turn 13 Carousel' },
    { id: 'ta-14', x: -280, y: 90, elevation: 0, width: 14, banking: 3, cornerName: 'Turn 14 Final' }
  ]
};

export const ROVAL_ROAD_COURSE: TrackConfig = {
  id: 'preset-roval-course',
  name: 'Charlotte Roval (Infield + Oval)',
  isClosed: true,
  defaultWidth: 16,
  asphaltColor: '#1A212D',
  version: 2,
  startIndex: 0,
  dressing: {
    curbStyle: 'blue_yellow',
    asphaltStyle: 'modern_f1',
    runoffStyle: 'asphalt_stripes',
    sponsorName: 'BANK OF AMERICA ROVAL'
  },
  nodes: [
    { id: 'rv-1', x: -180, y: 180, elevation: 0, width: 17, banking: 3, cornerName: 'Oval Start / Finish' },
    { id: 'rv-2', x: -20, y: 180, elevation: 0, width: 13, banking: 0, cornerName: 'Infield Turn 1 Divergence' },
    { id: 'rv-3', x: 40, y: 120, elevation: 1, width: 12, banking: 2, cornerName: 'Infield Hairpin' },
    { id: 'rv-4', x: 20, y: 40, elevation: 2, width: 12, banking: 3, cornerName: 'Infield Carousel' },
    { id: 'rv-5', x: 90, y: -20, elevation: 1, width: 13, banking: 4, cornerName: 'Infield Chute' },
    { id: 'rv-6', x: 170, y: 20, elevation: 0, width: 14, banking: 2, cornerName: 'Infield Re-entry' },
    { id: 'rv-7', x: 270, y: 80, elevation: 1, width: 18, banking: 18, cornerName: 'Oval Turn 1 High Bank' },
    { id: 'rv-8', x: 340, y: -30, elevation: 2, width: 18, banking: 24, cornerName: 'Oval Turn 2' },
    { id: 'rv-9', x: 180, y: -160, elevation: 1, width: 18, banking: 4, cornerName: 'Backstretch' },
    { id: 'rv-10', x: 60, y: -160, elevation: 0, width: 13, banking: 0, cornerName: 'Backstretch Bus Stop Chicane' },
    { id: 'rv-11', x: -80, y: -160, elevation: 0, width: 18, banking: 4, cornerName: 'Backstretch Exit' },
    { id: 'rv-12', x: -260, y: -120, elevation: 1, width: 18, banking: 20, cornerName: 'Oval Turn 3' },
    { id: 'rv-13', x: -330, y: 10, elevation: 2, width: 18, banking: 24, cornerName: 'Oval Turn 4 High Bank' },
    { id: 'rv-14', x: -270, y: 130, elevation: 0, width: 12, banking: 0, cornerName: 'Frontstretch Chicane' }
  ]
};

export const KARTING_CHAMPIONSHIP: TrackConfig = {
  id: 'preset-karting-championship',
  name: 'World Karting Championship',
  isClosed: true,
  defaultWidth: 9,
  asphaltColor: '#202633',
  version: 2,
  startIndex: 0,
  dressing: {
    curbStyle: 'red_white',
    asphaltStyle: 'modern_f1',
    runoffStyle: 'grass_verge',
    sponsorName: 'CIK-FIA KARTING'
  },
  nodes: [
    { id: 'kt-1', x: -160, y: 80, elevation: 0, width: 10, banking: 0, cornerName: 'Start / Finish' },
    { id: 'kt-2', x: -50, y: 85, elevation: 0, width: 9, banking: 3, cornerName: 'Turn 1 Fast Right' },
    { id: 'kt-3', x: 20, y: 40, elevation: 1, width: 8.5, banking: 4, cornerName: 'Turn 2 Chicane' },
    { id: 'kt-4', x: 10, y: -30, elevation: 1, width: 8.5, banking: 4, cornerName: 'Turn 3 Chicane' },
    { id: 'kt-5', x: 70, y: -70, elevation: 0, width: 9, banking: 5, cornerName: 'Turn 4 Hairpin' },
    { id: 'kt-6', x: 20, y: -110, elevation: 0, width: 8.5, banking: 2, cornerName: 'Turn 5 Left' },
    { id: 'kt-7', x: -50, y: -100, elevation: 1, width: 9, banking: 3, cornerName: 'Turn 6 Right' },
    { id: 'kt-8', x: -100, y: -60, elevation: 1, width: 8.5, banking: 4, cornerName: 'Turn 7 Hairpin' },
    { id: 'kt-9', x: -140, y: -10, elevation: 0, width: 9, banking: 2, cornerName: 'Turn 8 Final Sweeper' }
  ]
};

export const CIRCUIT_PRESETS: TrackConfig[] = [
  GRAND_PRIX_INTERNATIONAL,
  TRI_OVAL_SUPERSPEEDWAY,
  MONACO_STREET_CIRCUIT,
  SUZUKA_FIGURE_EIGHT,
  MOUNT_PANORAMA_HILLCLIMB,
  TECHNICAL_ARENA,
  ROVAL_ROAD_COURSE,
  KARTING_CHAMPIONSHIP
];
