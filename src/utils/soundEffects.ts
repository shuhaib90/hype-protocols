/**
 * Retro 8-Bit Chiptune Sound Synthesizer
 * Uses native Web Audio API oscillators for authentic arcade sounds
 * Zero external audio files required (100% offline & instant response)
 */

class SoundEffectsController {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

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
}

export const soundEffects = new SoundEffectsController();
