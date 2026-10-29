/** One shared F1 spec keeps live driving and AI performance consistent. */
export interface CarSpecs {
  id: string;
  topSpeedKmh: number;
  physics: {
    maxDriveAccel: number;
    brakeDecel: number;
    reverseAccel: number;
    reverseMaxSpeedMs: number;
    maxForwardSpeedMs: number;
    dragCoeff: number;
    rollingFriction: number;
    engineBraking: number;
    turnRateScale: number;
    gripMultiplier: number;
    gravelPenalty: number;
  };
}

export const DEFAULT_PLAYER_CAR_ID = 'f1_single_seater';
export const DEFAULT_AI_CAR_ID = DEFAULT_PLAYER_CAR_ID;

export const CAR_PRESETS: Record<string, CarSpecs> = {
  [DEFAULT_PLAYER_CAR_ID]: {
    id: DEFAULT_PLAYER_CAR_ID,
    topSpeedKmh: 342,
    physics: {
      maxDriveAccel: 44,
      brakeDecel: 52,
      reverseAccel: 16,
      reverseMaxSpeedMs: -12,
      maxForwardSpeedMs: 95,
      dragCoeff: 0.002,
      rollingFriction: 1.2,
      engineBraking: 7.5,
      turnRateScale: 1.05,
      gripMultiplier: 1.05,
      gravelPenalty: 0.35
    }
  }
};
