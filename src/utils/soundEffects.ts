/**
 * Retro 8-Bit Chiptune Sound Synthesizer
 * Uses native Web Audio API oscillators for authentic arcade sounds
 * Zero external audio files required (100% offline & instant response)
 */

interface GpuAudioCluster {
  masterGain: GainNode;
  noiseSource?: AudioBufferSourceNode;
  filterNode?: BiquadFilterNode;
  motorOsc1?: OscillatorNode;
  motorOsc2?: OscillatorNode;
  whineOsc?: OscillatorNode;
  whineLfo?: OscillatorNode;
}

class SoundEffectsController {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private gpuAudioNodes: GpuAudioCluster | null = null;
  private isGpuRunning: boolean = false;
  private stopTimeoutId: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hashape_sfx_enabled');
      if (stored !== null) {
        this.soundEnabled = stored === 'true';
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public toggle(): boolean {
    this.soundEnabled = !this.soundEnabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('hashape_sfx_enabled', String(this.soundEnabled));
    }
    if (this.soundEnabled) {
      this.playClickSound();
    } else {
      this.stopGpuRunningSound();
    }
    return this.soundEnabled;
  }

  /**
   * 8-Bit Arcade Button Click (Short Frequency Blip)
   */
  public playClickSound() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.05); // A4

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  }

  /**
   * Mining Start Power-Up (Ascending 8-Bit Arpeggio: C4, E4, G4, C5)
   */
  public playMiningStartSound() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
      const noteDuration = 0.06;

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * noteDuration);

        const startTime = ctx.currentTime + index * noteDuration;
        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + noteDuration);
      });
    } catch (e) {}
  }

  /**
   * Valid Proof Discovered Victory Chime (G4, C5, E5, G5 Fanfare)
   */
  public playProofFoundSound() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const notes = [392.0, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
      const noteDuration = 0.1;

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        const startTime = ctx.currentTime + index * noteDuration;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + (index === notes.length - 1 ? 0.35 : noteDuration));

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + (index === notes.length - 1 ? 0.35 : noteDuration));
      });
    } catch (e) {}
  }

  /**
   * Triumphant On-Chain Minting Fanfare
   */
  public playMintSuccessSound() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const noteDuration = 0.12;

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        const startTime = ctx.currentTime + index * noteDuration;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + (index === notes.length - 1 ? 0.5 : noteDuration));

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + (index === notes.length - 1 ? 0.5 : noteDuration));
      });
    } catch (e) {}
  }

  /**
   * Worker Unlock Power-Up Chime
   */
  public playWorkerUnlockSound() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const notes = [330.0, 440.0, 554.37, 659.25]; // E4, A4, C#5, E5
      const noteDuration = 0.08;

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        const startTime = ctx.currentTime + index * noteDuration;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + noteDuration);
      });
    } catch (e) {}
  }

  /**
   * Continuous GPU Running Sound (Fan Spool-Up, Heavy Airflow Turbulence & Compute Coil Whine)
   * Starts as soon as mining starts and sustains an authentic high-power hardware sound until mining stops.
   */
  public startGpuRunningSound() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Clear any pending cleanup timeout
    if (this.stopTimeoutId) {
      clearTimeout(this.stopTimeoutId);
      this.stopTimeoutId = null;
    }

    // If already actively running, avoid stacking
    if (this.isGpuRunning && this.gpuAudioNodes) return;

    // Stop any decaying nodes immediately
    if (this.gpuAudioNodes) {
      try {
        this.gpuAudioNodes.noiseSource?.stop();
        this.gpuAudioNodes.motorOsc1?.stop();
        this.gpuAudioNodes.motorOsc2?.stop();
        this.gpuAudioNodes.whineOsc?.stop();
        this.gpuAudioNodes.whineLfo?.stop();
        this.gpuAudioNodes.masterGain.disconnect();
      } catch (_) {}
      this.gpuAudioNodes = null;
    }

    try {
      this.isGpuRunning = true;
      const now = ctx.currentTime;

      // Master output gain with spool-up volume curve
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.18, now + 1.2);
      masterGain.connect(ctx.destination);

      // 1. Airflow Turbulence Buffer (Pink/White noise through resonant lowpass)
      const bufferSize = Math.floor(ctx.sampleRate * 2);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.075;
        b6 = white * 0.115926;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Dual-stage biquad lowpass filter simulating blower rpm ramp
      const filterNode = ctx.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(220, now);
      filterNode.frequency.exponentialRampToValueAtTime(880, now + 1.3);
      filterNode.Q.setValueAtTime(1.6, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.6, now);

      noiseSource.connect(filterNode);
      filterNode.connect(noiseGain);
      noiseGain.connect(masterGain);

      // 2. Dual Axial Fan Motor Drone (Deep bass rumble + rotor blade harmonics)
      const motorOsc1 = ctx.createOscillator();
      motorOsc1.type = 'triangle';
      motorOsc1.frequency.setValueAtTime(45, now);
      motorOsc1.frequency.exponentialRampToValueAtTime(72, now + 1.3); // 72 Hz motor hum

      const motorOsc2 = ctx.createOscillator();
      motorOsc2.type = 'sawtooth';
      motorOsc2.frequency.setValueAtTime(90, now);
      motorOsc2.frequency.exponentialRampToValueAtTime(144, now + 1.3); // 144 Hz rotor blade harmonic

      const motorFilter = ctx.createBiquadFilter();
      motorFilter.type = 'lowpass';
      motorFilter.frequency.setValueAtTime(260, now);

      const motorGain = ctx.createGain();
      motorGain.gain.setValueAtTime(0.24, now);

      motorOsc1.connect(motorFilter);
      motorOsc2.connect(motorFilter);
      motorFilter.connect(motorGain);
      motorGain.connect(masterGain);

      // 3. Realistic Compute Coil Whine (subtle high-frequency inductor vibration with micro-jitter)
      const whineOsc = ctx.createOscillator();
      whineOsc.type = 'sine';
      whineOsc.frequency.setValueAtTime(2650, now);

      const whineLfo = ctx.createOscillator();
      whineLfo.frequency.setValueAtTime(5.2, now); // 5.2 Hz compute load cycle
      const whineLfoGain = ctx.createGain();
      whineLfoGain.gain.setValueAtTime(120, now); // +/- 120 Hz modulation
      whineLfo.connect(whineLfoGain);
      whineLfoGain.connect(whineOsc.frequency);

      const whineGain = ctx.createGain();
      whineGain.gain.setValueAtTime(0.012, now); // Clean, subtle high-tech presence

      whineOsc.connect(whineGain);
      whineGain.connect(masterGain);

      // Fire audio nodes simultaneously
      noiseSource.start(now);
      motorOsc1.start(now);
      motorOsc2.start(now);
      whineOsc.start(now);
      whineLfo.start(now);

      this.gpuAudioNodes = {
        masterGain,
        noiseSource,
        filterNode,
        motorOsc1,
        motorOsc2,
        whineOsc,
        whineLfo,
      };
    } catch (e) {
      console.warn('Could not start GPU running sound:', e);
    }
  }

  /**
   * Stop GPU Running Sound (Fan Spool-Down & Deceleration Pitch Drop)
   */
  public stopGpuRunningSound() {
    this.isGpuRunning = false;
    if (!this.gpuAudioNodes) return;
    const ctx = this.getAudioContext();
    const nodes = this.gpuAudioNodes;
    this.gpuAudioNodes = null;

    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const stopDuration = 0.75;

      // Realistic deceleration pitch drop
      if (nodes.filterNode) {
        nodes.filterNode.frequency.setValueAtTime(nodes.filterNode.frequency.value, now);
        nodes.filterNode.frequency.exponentialRampToValueAtTime(120, now + stopDuration);
      }
      if (nodes.motorOsc1) {
        nodes.motorOsc1.frequency.setValueAtTime(nodes.motorOsc1.frequency.value, now);
        nodes.motorOsc1.frequency.exponentialRampToValueAtTime(25, now + stopDuration);
      }
      if (nodes.motorOsc2) {
        nodes.motorOsc2.frequency.setValueAtTime(nodes.motorOsc2.frequency.value, now);
        nodes.motorOsc2.frequency.exponentialRampToValueAtTime(50, now + stopDuration);
      }

      // Smooth exponential gain fadeout to complete silence
      nodes.masterGain.gain.setValueAtTime(Math.max(nodes.masterGain.gain.value, 0.001), now);
      nodes.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + stopDuration);

      this.stopTimeoutId = setTimeout(() => {
        try {
          nodes.noiseSource?.stop();
          nodes.motorOsc1?.stop();
          nodes.motorOsc2?.stop();
          nodes.whineOsc?.stop();
          nodes.whineLfo?.stop();
          nodes.masterGain.disconnect();
        } catch (_) {}
      }, stopDuration * 1000 + 100);
    } catch (e) {
      console.warn('Error stopping GPU running sound:', e);
    }
  }
}

export const soundEffects = new SoundEffectsController();
