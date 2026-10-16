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
  name: 'Autódromo de Interlagos (São Paulo)',
  isClosed: true,
  defaultWidth: 14,
  asphaltColor: '#1C2129',
  version: 2,
  startIndex: 0,
  dressing: {
    curbStyle: 'red_white',
    asphaltStyle: 'modern_f1',
    runoffStyle: 'gravel_trap',
    sponsorName: 'GRANDE PRÊMIO DO BRASIL'
  },
  nodes: [
    { id: 'gp-1', x: -340, y: 150, elevation: 2, width: 15, banking: 2, cornerName: 'Reta dos Boxes' },
    { id: 'gp-2', x: -120, y: 150, elevation: 3, width: 15, banking: 2, cornerName: 'Pit Straight' },
    { id: 'gp-3', x: 60, y: 150, elevation: 2, width: 14, banking: 3, cornerName: 'Turn 1 (Senna S Entry)' },
    { id: 'gp-4', x: 130, y: 110, elevation: 0, width: 13, banking: 5, cornerName: 'Turn 2 (Senna S Exit)' },
    { id: 'gp-5', x: 125, y: 30, elevation: -2, width: 14, banking: 4, cornerName: 'Curva do Sol (T3)' },
    { id: 'gp-6', x: 30, y: -40, elevation: -5, width: 15, banking: 1, cornerName: 'Reta Oposta' },
    { id: 'gp-7', x: -140, y: -80, elevation: -7, width: 15, banking: 1, cornerName: 'Reta Oposta Braking' },
    { id: 'gp-8', x: -250, y: -100, elevation: -8, width: 13, banking: 6, cornerName: 'Descida do Lago (T4)' },
    { id: 'gp-9', x: -280, y: -170, elevation: -6, width: 13, banking: 5, cornerName: 'Descida do Lago Exit (T5)' },
    { id: 'gp-10', x: -210, y: -230, elevation: -4, width: 14, banking: 4, cornerName: 'Ferradura (T6)' },
    { id: 'gp-11', x: -80, y: -220, elevation: 0, width: 14, banking: 3, cornerName: 'Ferradura Exit (T7)' },
    { id: 'gp-12', x: 30, y: -190, elevation: 3, width: 12, banking: 4, cornerName: 'Laranjinha (T8 Hairpin)' },
    { id: 'gp-13', x: 50, y: -110, elevation: 4, width: 13, banking: 3, cornerName: 'Pinheirinho (T9)' },
    { id: 'gp-14', x: -30, y: -80, elevation: 2, width: 13, banking: 3, cornerName: 'Bico de Pato (T10)' },
    { id: 'gp-15', x: -100, y: -10, elevation: 0, width: 14, banking: 4, cornerName: 'Mergulho (T11)' },
    { id: 'gp-16', x: -220, y: 40, elevation: 0, width: 15, banking: 8, cornerName: 'Junção (T12)' },
    { id: 'gp-17', x: -320, y: 70, elevation: 1, width: 16, banking: 10, cornerName: 'Subida dos Boxes (T13)' },
    { id: 'gp-18', x: -360, y: 110, elevation: 2, width: 15, banking: 8, cornerName: 'Arquibancadas (T14)' }
  ]
};

export const MONACO_STREET_CIRCUIT: TrackConfig = {
  id: 'preset-monaco-street',
  name: 'Circuit de Monaco (Monte Carlo)',
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
    { id: 'mc-1', x: -200, y: 95, elevation: 1, width: 12, banking: 0, cornerName: 'Boulevard Albert 1er' },
    { id: 'mc-2', x: -90, y: 105, elevation: 1, width: 12, banking: 1, cornerName: 'Pit Straight' },
    { id: 'mc-3', x: -10, y: 115, elevation: 2, width: 10.5, banking: 2, cornerName: 'Sainte Dévote (T1)' },
    { id: 'mc-4', x: 40, y: 70, elevation: 12, width: 11, banking: 1, cornerName: 'Montée du Beau Rivage' },
    { id: 'mc-5', x: 75, y: -10, elevation: 26, width: 11, banking: 2, cornerName: 'Beau Rivage Upper' },
    { id: 'mc-6', x: 60, y: -80, elevation: 38, width: 10.5, banking: 4, cornerName: 'Massenet (T2)' },
    { id: 'mc-7', x: 10, y: -115, elevation: 42, width: 11, banking: 2, cornerName: 'Casino Square (T3 Apex)' },
    { id: 'mc-8', x: -40, y: -130, elevation: 34, width: 10.5, banking: 3, cornerName: 'Mirabeau Haute (T4)' },
    { id: 'mc-9', x: -90, y: -135, elevation: 24, width: 10, banking: 4, cornerName: 'Fairmont Approach' },
    { id: 'mc-10', x: -120, y: -110, elevation: 16, width: 9.5, banking: 6, cornerName: 'Grand Hotel Hairpin (T5)' },
    { id: 'mc-11', x: -105, y: -70, elevation: 10, width: 10, banking: 3, cornerName: 'Mirabeau Bas (T6)' },
    { id: 'mc-12', x: -85, y: -25, elevation: 4, width: 10.5, banking: 2, cornerName: 'Portier (T7)' },
    { id: 'mc-13', x: -50, y: 5, elevation: 2, width: 13, banking: 0, cornerName: 'Tunnel Entry' },
    { id: 'mc-14', x: 10, y: 30, elevation: 1, width: 13, banking: 2, cornerName: 'Tunnel Sweeper' },
    { id: 'mc-15', x: 70, y: 40, elevation: 1, width: 13, banking: 0, cornerName: 'Tunnel Exit (DRS Zone)' },
    { id: 'mc-16', x: 110, y: 45, elevation: 1, width: 10, banking: 0, cornerName: 'Nouvelle Chicane (T10)' },
    { id: 'mc-17', x: 115, y: 70, elevation: 1, width: 10.5, banking: 0, cornerName: 'Nouvelle Chicane Exit' },
    { id: 'mc-18', x: 75, y: 90, elevation: 1, width: 11, banking: 3, cornerName: 'Tabac (T12)' },
    { id: 'mc-19', x: 15, y: 85, elevation: 1, width: 11, banking: 2, cornerName: 'Louis Chiron (T13)' },
    { id: 'mc-20', x: -45, y: 80, elevation: 1, width: 10, banking: 0, cornerName: 'Piscine (Swimming Pool T14)' },
    { id: 'mc-21', x: -105, y: 70, elevation: 1, width: 11, banking: 0, cornerName: 'Piscine Exit (T16)' },
    { id: 'mc-22', x: -155, y: 55, elevation: 1, width: 9.5, banking: 4, cornerName: 'La Rascasse (T17)' },
    { id: 'mc-23', x: -185, y: 75, elevation: 1, width: 10.5, banking: 2, cornerName: 'Anthony Noghès (T18)' }
  ]
};

export const CIRCUIT_DE_SPA_FRANCORCHAMPS: TrackConfig = {
  id: 'preset-spa-francorchamps',
  name: 'Circuit de Spa-Francorchamps (Ardennes)',
  isClosed: true,
  defaultWidth: 14.5,
  asphaltColor: '#1A202C',
  version: 2,
  startIndex: 0,
  dressing: {
    curbStyle: 'red_white',
    asphaltStyle: 'modern_f1',
    runoffStyle: 'gravel_trap',
    sponsorName: 'ROLEX BELGIAN GRAND PRIX'
  },
  nodes: [
    { id: 'spa-1', x: -40, y: 520, elevation: 0, width: 15.5, banking: 0, cornerName: 'Start / Finish Straight' },
    { id: 'spa-2', x: 160, y: 550, elevation: 0, width: 15.5, banking: 0, cornerName: 'Pit Straight' },
    { id: 'spa-3', x: 360, y: 570, elevation: 0, width: 13, banking: 3, cornerName: 'La Source Hairpin (T1)' },
    { id: 'spa-4', x: 420, y: 400, elevation: -3, width: 15, banking: 0, cornerName: 'Descent to Eau Rouge' },
    { id: 'spa-5', x: 400, y: 180, elevation: -6, width: 14.5, banking: 4, cornerName: 'Eau Rouge (T2 Left Dip)' },
    { id: 'spa-6', x: 350, y: 0, elevation: 6, width: 14, banking: 5, cornerName: 'Raidillon (T3 Climb)' },
    { id: 'spa-7', x: 280, y: -150, elevation: 20, width: 14, banking: 4, cornerName: 'Raidillon Crest (T4)' },
    { id: 'spa-8', x: 220, y: -340, elevation: 28, width: 15, banking: 1, cornerName: 'Kemmel Straight Entry' },
    { id: 'spa-9', x: 110, y: -640, elevation: 27, width: 15, banking: 1, cornerName: 'Kemmel Straight (340 km/h)' },
    { id: 'spa-10', x: -20, y: -840, elevation: 24, width: 14, banking: 2, cornerName: 'Les Combes Braking' },
    { id: 'spa-11', x: -120, y: -880, elevation: 22, width: 12.5, banking: 3, cornerName: 'Les Combes Chicane (T5/T6)' },
    { id: 'spa-12', x: -200, y: -800, elevation: 19, width: 13, banking: 4, cornerName: 'Malmedy (T7 Right)' },
    { id: 'spa-13', x: -190, y: -620, elevation: 15, width: 12.5, banking: 5, cornerName: 'Bruxelles / Rivage (T8 Entry)' },
    { id: 'spa-14', x: -270, y: -560, elevation: 10, width: 12, banking: 6, cornerName: 'Rivage Hairpin Apex' },
    { id: 'spa-15', x: -350, y: -480, elevation: 7, width: 13, banking: 3, cornerName: 'Speakers Corner (T9)' },
    { id: 'spa-16', x: -480, y: -350, elevation: 4, width: 14, banking: 7, cornerName: 'Double Gauche / Pouhon 1' },
    { id: 'spa-17', x: -510, y: -180, elevation: 2, width: 14, banking: 8, cornerName: 'Pouhon 2 (Flat-Out Apex)' },
    { id: 'spa-18', x: -440, y: -30, elevation: 1, width: 13.5, banking: 3, cornerName: 'Campus (Piff-Paff T12)' },
    { id: 'spa-19', x: -370, y: 120, elevation: 1, width: 13.5, banking: 4, cornerName: 'Stavelot (T14/T15)' },
    { id: 'spa-20', x: -270, y: 250, elevation: 0, width: 15, banking: 2, cornerName: 'Paul Frere' },
    { id: 'spa-21', x: -180, y: 360, elevation: 0, width: 15, banking: 6, cornerName: 'Blanchimont 1 (T16, 300 km/h)' },
    { id: 'spa-22', x: -100, y: 440, elevation: 0, width: 15, banking: 5, cornerName: 'Blanchimont 2 (T17)' },
    { id: 'spa-23', x: -40, y: 490, elevation: 0, width: 11.5, banking: 0, cornerName: 'Bus Stop Chicane (T18/T19)' }
  ]
};

export const SUZUKA_FIGURE_EIGHT: TrackConfig = {
  id: 'preset-suzuka-figure8',
  name: 'Suzuka International Circuit (Figure-8)',
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
    { id: 'sz-1', x: -220, y: 220, elevation: 0, width: 15, banking: 0, cornerName: 'Pit Straight' },
    { id: 'sz-2', x: -80, y: 230, elevation: 1, width: 15, banking: 3, cornerName: 'First Corner (T1 Entry)' },
    { id: 'sz-3', x: -30, y: 175, elevation: 2, width: 13, banking: 5, cornerName: 'First Corner (T2 Apex)' },
    { id: 'sz-4', x: 20, y: 140, elevation: 4, width: 13, banking: 5, cornerName: 'S-Curves (T3 Left)' },
    { id: 'sz-5', x: -10, y: 95, elevation: 6, width: 13, banking: 5, cornerName: 'S-Curves (T4 Right)' },
    { id: 'sz-6', x: 30, y: 50, elevation: 8, width: 13, banking: 5, cornerName: 'S-Curves (T5 Left)' },
    { id: 'sz-7', x: 65, y: -20, elevation: 10, width: 13.5, banking: 4, cornerName: 'Dunlop Curve (T7 Sweeper)' },
    { id: 'sz-8', x: 75, y: -80, elevation: 8, width: 12.5, banking: 4, cornerName: 'Degner 1 (T8 Fast Right)' },
    { id: 'sz-9', x: 115, y: -95, elevation: 5, width: 11.5, banking: 2, cornerName: 'Degner 2 (T9 90-Degree)' },
    { id: 'sz-10', x: 80, y: -130, elevation: 0, width: 14, banking: 0, cornerName: 'Underpass (Crossing Lower)' },
    { id: 'sz-11', x: 110, y: -190, elevation: 1, width: 13, banking: 3, cornerName: '110R Sweeper' },
    { id: 'sz-12', x: 85, y: -235, elevation: 2, width: 11, banking: 5, cornerName: 'Hairpin (T11 Left 180°)' },
    { id: 'sz-13', x: 10, y: -220, elevation: 4, width: 14, banking: 4, cornerName: '200R Sweeper' },
    { id: 'sz-14', x: -70, y: -190, elevation: 6, width: 13, banking: 6, cornerName: 'Spoon Curve 1 (T13)' },
    { id: 'sz-15', x: -140, y: -140, elevation: 7, width: 13, banking: 7, cornerName: 'Spoon Curve 2 (T14 Apex)' },
    { id: 'sz-16', x: -110, y: -90, elevation: 8.5, width: 15, banking: 2, cornerName: 'Back Straight Entry' },
    { id: 'sz-17', x: 80, y: -130, elevation: 9.5, width: 15, banking: 1, cornerName: 'Crossover Bridge (Upper)' },
    { id: 'sz-18', x: 160, y: -30, elevation: 6, width: 15, banking: 2, cornerName: 'Back Straight (310 km/h)' },
    { id: 'sz-19', x: 180, y: 60, elevation: 4, width: 15, banking: 8, cornerName: '130R (T15 Flat-Out Left)' },
    { id: 'sz-20', x: 120, y: 160, elevation: 1, width: 11, banking: 0, cornerName: 'Casio Triangle Chicane (T16)' },
    { id: 'sz-21', x: -60, y: 200, elevation: 0, width: 14, banking: 2, cornerName: 'Final Corner (T18)' }
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
    sponsorName: 'DAYTONA 500 SUPERSPEEDWAY'
  },
  nodes: [
    { id: 'ov-1', x: -220, y: 160, elevation: 0, width: 18, banking: 5, cornerName: 'Start / Finish' },
    { id: 'ov-2', x: 0, y: 185, elevation: 0, width: 18, banking: 18, cornerName: 'Tri-Oval Dogleg Apex' },
    { id: 'ov-3', x: 220, y: 160, elevation: 1, width: 18, banking: 14, cornerName: 'Turn 1 Entry' },
    { id: 'ov-4', x: 390, y: 100, elevation: 2.5, width: 19, banking: 31, cornerName: 'Turn 1 High Bank (31°)' },
    { id: 'ov-5', x: 440, y: -20, elevation: 2.5, width: 19, banking: 31, cornerName: 'Turn 2 Apex (31° Bank)' },
    { id: 'ov-6', x: 360, y: -130, elevation: 1.5, width: 18, banking: 24, cornerName: 'Turn 2 Exit' },
    { id: 'ov-7', x: 120, y: -175, elevation: 0, width: 18, banking: 2, cornerName: 'Superstretch Back Straight' },
    { id: 'ov-8', x: -140, y: -175, elevation: 0, width: 18, banking: 2, cornerName: 'Backstretch Drafting Zone' },
    { id: 'ov-9', x: -360, y: -130, elevation: 1.5, width: 18, banking: 24, cornerName: 'Turn 3 Entry' },
    { id: 'ov-10', x: -440, y: -20, elevation: 2.5, width: 19, banking: 31, cornerName: 'Turn 3 High Bank (31°)' },
    { id: 'ov-11', x: -390, y: 95, elevation: 2.5, width: 19, banking: 31, cornerName: 'Turn 4 Apex (31° Bank)' },
    { id: 'ov-12', x: -280, y: 145, elevation: 0.5, width: 18, banking: 16, cornerName: 'Turn 4 Exit' }
  ]
};

export const AUTODROMO_NAZIONALE_MONZA: TrackConfig = {
  id: 'preset-monza-temple-of-speed',
  name: 'Autodromo Nazionale Monza (Temple of Speed)',
  isClosed: true,
  defaultWidth: 14,
  asphaltColor: '#1E232F',
  version: 2,
  startIndex: 0,
  dressing: {
    curbStyle: 'monza_black_yellow',
    asphaltStyle: 'modern_f1',
    runoffStyle: 'gravel_trap',
    sponsorName: 'GRAN PREMIO D’ITALIA'
  },
  nodes: [
    { id: 'mz-1', x: -280, y: 180, elevation: 0, width: 15, banking: 0, cornerName: 'Rettifilo Tribune (Start/Finish)' },
    { id: 'mz-2', x: -80, y: 180, elevation: 0, width: 15, banking: 0, cornerName: 'Pit Straight (350 km/h)' },
    { id: 'mz-3', x: 20, y: 180, elevation: 0, width: 11, banking: 0, cornerName: 'Variante del Rettifilo (T1/T2)' },
    { id: 'mz-4', x: 80, y: 150, elevation: 1, width: 14, banking: 4, cornerName: 'Curva Grande (Biassono T3)' },
    { id: 'mz-5', x: 140, y: 80, elevation: 1, width: 14, banking: 5, cornerName: 'Curva Grande Sweeper' },
    { id: 'mz-6', x: 170, y: -20, elevation: 0, width: 14, banking: 1, cornerName: 'Rettifilo di Roggia' },
    { id: 'mz-7', x: 165, y: -70, elevation: 0, width: 11, banking: 0, cornerName: 'Variante della Roggia (T4/T5)' },
    { id: 'mz-8', x: 120, y: -120, elevation: 0, width: 12, banking: 3, cornerName: 'Curva di Lesmo 1 (T6)' },
    { id: 'mz-9', x: 50, y: -150, elevation: -1, width: 12, banking: 4, cornerName: 'Curva di Lesmo 2 (T7)' },
    { id: 'mz-10', x: -30, y: -170, elevation: -2, width: 14, banking: 0, cornerName: 'Curva del Serraglio (Underpass)' },
    { id: 'mz-11', x: -140, y: -170, elevation: 0, width: 11, banking: 0, cornerName: 'Variante Ascari Entry (T8)' },
    { id: 'mz-12', x: -175, y: -145, elevation: 0, width: 12, banking: 2, cornerName: 'Variante Ascari Apex (T9/T10)' },
    { id: 'mz-13', x: -190, y: -70, elevation: 0, width: 15, banking: 0, cornerName: 'Rettifilo del Centro' },
    { id: 'mz-14', x: -200, y: 40, elevation: 0, width: 15, banking: 2, cornerName: 'Parabolica Braking' },
    { id: 'mz-15', x: -240, y: 110, elevation: 0, width: 14, banking: 7, cornerName: 'Curva Parabolica (Alboreto T11)' },
    { id: 'mz-16', x: -280, y: 140, elevation: 0, width: 15, banking: 4, cornerName: 'Parabolica Exit' }
  ]
};

export const MOUNT_PANORAMA_HILLCLIMB: TrackConfig = {
  id: 'preset-bathurst-mountain',
  name: 'Mount Panorama (Bathurst 1000)',
  isClosed: true,
  defaultWidth: 12,
  asphaltColor: '#1A222C',
  version: 2,
  startIndex: 0,
  dressing: {
    curbStyle: 'green_white',
    asphaltStyle: 'classic_weathered',
    runoffStyle: 'gravel_trap',
    sponsorName: 'REPACO BATHURST 1000'
  },
  nodes: [
    { id: 'bt-1', x: -340, y: 140, elevation: 0, width: 14, banking: 0, cornerName: 'Pit Straight' },
    { id: 'bt-2', x: -120, y: 140, elevation: 0, width: 13, banking: 3, cornerName: 'Hell Corner (T1 90° Left)' },
    { id: 'bt-3', x: 80, y: 110, elevation: 12, width: 13, banking: 1, cornerName: 'Mountain Straight Climb' },
    { id: 'bt-4', x: 240, y: 70, elevation: 24, width: 11.5, banking: 6, cornerName: 'Griffin\'s Bend (T2 Right)' },
    { id: 'bt-5', x: 270, y: -20, elevation: 38, width: 10, banking: 8, cornerName: 'The Cutting (T3 Steep 1:6)' },
    { id: 'bt-6', x: 220, y: -90, elevation: 48, width: 10, banking: 5, cornerName: 'Reid Park (T4 Fast Blind)' },
    { id: 'bt-7', x: 140, y: -130, elevation: 56, width: 11, banking: 5, cornerName: 'Sulman Park (T5)' },
    { id: 'bt-8', x: 30, y: -150, elevation: 62, width: 11, banking: 4, cornerName: 'McPhillamy Park (Mountain Crest)' },
    { id: 'bt-9', x: -80, y: -130, elevation: 52, width: 10, banking: 2, cornerName: 'Skyline (The Steep Drop)' },
    { id: 'bt-10', x: -150, y: -90, elevation: 34, width: 9.5, banking: 6, cornerName: 'The Esses (Downhill S-Bends)' },
    { id: 'bt-11', x: -180, y: -40, elevation: 20, width: 9.5, banking: 9, cornerName: 'The Dipper (Famous Drop)' },
    { id: 'bt-12', x: -175, y: 20, elevation: 10, width: 11, banking: 6, cornerName: 'Forrest\'s Elbow (Hairpin Exit)' },
    { id: 'bt-13', x: -230, y: 60, elevation: 4, width: 14, banking: 0, cornerName: 'Conrod Straight (1.9 km)' },
    { id: 'bt-14', x: -300, y: 90, elevation: 1, width: 14, banking: 0, cornerName: 'Conrod Downhill (300 km/h)' },
    { id: 'bt-15', x: -330, y: 110, elevation: 0.5, width: 12, banking: 3, cornerName: 'The Chase Chicane' },
    { id: 'bt-16', x: -350, y: 125, elevation: 0, width: 13, banking: 2, cornerName: 'Murray\'s Corner' }
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
    sponsorName: 'CHAMPIONSHIP TECHNICAL ARENA'
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
  CIRCUIT_DE_SPA_FRANCORCHAMPS,
  MONACO_STREET_CIRCUIT,
  SUZUKA_FIGURE_EIGHT,
  AUTODROMO_NAZIONALE_MONZA,
  GRAND_PRIX_INTERNATIONAL,
  TRI_OVAL_SUPERSPEEDWAY,
  MOUNT_PANORAMA_HILLCLIMB,
  TECHNICAL_ARENA,
  ROVAL_ROAD_COURSE,
  KARTING_CHAMPIONSHIP
];
