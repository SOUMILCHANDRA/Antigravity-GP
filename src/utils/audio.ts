/**
 * Restrained Motorsport Sound Engine
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  
  private squealGain: GainNode | null = null;
  private isMuted: boolean = true; // Muted by default
  private isInitialized: boolean = false;

  // Rival AI Engine Audio Nodes
  private rivalOsc: OscillatorNode | null = null;
  private rivalFilter: BiquadFilterNode | null = null;
  private rivalGain: GainNode | null = null;
  private rivalPanner: StereoPannerNode | null = null;

  public init(): void {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Engine Gain
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(500, this.ctx.currentTime);

      // Single clean engine oscillator (sawtooth with lowpass for smooth motor pitch)
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(65, this.ctx.currentTime);

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();

      // Rival AI Engine Setup (Slightly higher pitch screaming V10 tone)
      this.rivalGain = this.ctx.createGain();
      this.rivalGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.rivalFilter = this.ctx.createBiquadFilter();
      this.rivalFilter.type = 'lowpass';
      this.rivalFilter.frequency.setValueAtTime(450, this.ctx.currentTime);

      this.rivalOsc = this.ctx.createOscillator();
      this.rivalOsc.type = 'sawtooth';
      this.rivalOsc.frequency.setValueAtTime(75, this.ctx.currentTime);

      if (this.ctx.createStereoPanner) {
        this.rivalPanner = this.ctx.createStereoPanner();
        this.rivalOsc.connect(this.rivalFilter);
        this.rivalFilter.connect(this.rivalGain);
        this.rivalGain.connect(this.rivalPanner);
        this.rivalPanner.connect(this.ctx.destination);
      } else {
        this.rivalOsc.connect(this.rivalFilter);
        this.rivalFilter.connect(this.rivalGain);
        this.rivalGain.connect(this.ctx.destination);
      }

      this.rivalOsc.start();

      // Tire squeal setup
      this.setupTireSqueal();

      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext initialization blocked:', e);
    }
  }

  private setupTireSqueal(): void {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1200;
    bandpass.Q.value = 4.0;

    this.squealGain = this.ctx.createGain();
    this.squealGain.gain.value = 0;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;
    noiseSource.connect(bandpass);
    bandpass.connect(this.squealGain);
    this.squealGain.connect(this.ctx.destination);
    noiseSource.start();
  }

  public updateEngineSound(speedKmh: number, throttle: number, isRacing: boolean): void {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (!isRacing) {
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      return;
    }

    // Map speed (0 -> 320 km/h) to pitch (60 Hz -> 420 Hz)
    const normSpeed = Math.max(0, Math.min(1, speedKmh / 320));
    const baseFreq = 65 + normSpeed * 350 + throttle * 40;

    if (this.engineOsc && this.engineFilter && this.engineGain) {
      this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.08);

      const filterFreq = 350 + normSpeed * 2200 + throttle * 800;
      this.engineFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.08);

      const targetVolume = 0.03 + throttle * 0.12 + normSpeed * 0.05;
      this.engineGain.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.08);
    }
  }

  public updateRivalEngineSound(
    rivalSpeedKmh: number,
    rivalThrottle: number,
    distanceMeters: number,
    panX: number,
    isRacing: boolean
  ): void {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    if (!isRacing || distanceMeters > 55) {
      if (this.rivalGain) {
        this.rivalGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      return;
    }

    const normSpeed = Math.max(0, Math.min(1, Math.abs(rivalSpeedKmh) / 330));
    const baseFreq = 75 + normSpeed * 380 + (rivalThrottle > 0 ? 40 : 0);

    if (this.rivalOsc && this.rivalFilter && this.rivalGain) {
      this.rivalOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.08);

      const filterFreq = 380 + normSpeed * 2300 + (rivalThrottle > 0 ? 600 : 0);
      this.rivalFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.08);

      const falloff = 1 / (1 + distanceMeters * 0.08);
      const targetVolume = (0.02 + normSpeed * 0.08 + (rivalThrottle > 0 ? 0.03 : 0)) * falloff;
      this.rivalGain.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.08);

      if (this.rivalPanner) {
        const clampedPan = Math.max(-0.85, Math.min(0.85, panX));
        this.rivalPanner.pan.setTargetAtTime(clampedPan, this.ctx.currentTime, 0.08);
      }
    }
  }

  public updateTireSqueal(skidding: boolean): void {
    if (!this.isInitialized || !this.ctx || !this.squealGain || this.isMuted) return;
    const targetGain = skidding ? 0.08 : 0;
    this.squealGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.engineGain) this.engineGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
      if (this.rivalGain) this.rivalGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const audioEngine = new SoundEngine();
