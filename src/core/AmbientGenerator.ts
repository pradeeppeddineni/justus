/**
 * AmbientGenerator — generates warm ambient music using Web Audio API.
 * Creates layered oscillators with LFO modulation and reverb.
 * Used as fallback when audio files aren't available.
 */

type MoodProfile = {
  baseFreqs: number[];
  filterCutoff: number;
  lfoRate: number;
  volume: number;
  reverbTime: number;
};

const MOODS: Record<string, MoodProfile> = {
  ambient: {
    baseFreqs: [130.81, 164.81, 196.0, 261.63], // C3, E3, G3, C4
    filterCutoff: 800,
    lfoRate: 0.15,
    volume: 0.12,
    reverbTime: 3,
  },
  intimate: {
    baseFreqs: [110.0, 138.59, 164.81, 220.0], // A2, C#3, E3, A3
    filterCutoff: 600,
    lfoRate: 0.1,
    volume: 0.08,
    reverbTime: 4,
  },
  intense: {
    baseFreqs: [146.83, 174.61, 220.0, 293.66], // D3, F3, A3, D4
    filterCutoff: 1200,
    lfoRate: 0.25,
    volume: 0.15,
    reverbTime: 2,
  },
  celestial: {
    baseFreqs: [196.0, 246.94, 293.66, 392.0], // G3, B3, D4, G4
    filterCutoff: 1000,
    lfoRate: 0.08,
    volume: 0.10,
    reverbTime: 5,
  },
  silent: {
    baseFreqs: [],
    filterCutoff: 0,
    lfoRate: 0,
    volume: 0,
    reverbTime: 0,
  },
};

// Map acts to moods
const ACT_MOODS: Record<string, string> = {
  invitation: 'silent',
  the_lock: 'ambient',
  know_me: 'ambient',
  lie_detector: 'ambient',
  through_your_eyes: 'ambient',
  heartbeat: 'ambient',
  the_unsaid: 'intimate',
  rewrite_history: 'intimate',
  come_closer: 'intimate',
  heat: 'intense',
  our_moment: 'ambient',
  the_promise: 'celestial',
  the_glitch: 'silent', // Music handled by glitch effect
};

export class AmbientGenerator {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private filter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private convolver: ConvolverNode | null = null;
  private currentMood: string = '';
  private muted = false;
  private started = false;

  /**
   * Initialize audio context on user gesture.
   */
  async init(): Promise<void> {
    if (this.ctx) return;

    this.ctx = new AudioContext();

    // Master gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);

    // Reverb (convolver with generated impulse response)
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.createReverbIR(3);
    this.convolver.connect(this.masterGain);

    // Low-pass filter
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 800;
    this.filter.Q.value = 0.7;

    // Route: filter → convolver (wet) + filter → masterGain (dry)
    const dryGain = this.ctx.createGain();
    dryGain.gain.value = 0.7;
    this.filter.connect(dryGain);
    dryGain.connect(this.masterGain);

    const wetGain = this.ctx.createGain();
    wetGain.gain.value = 0.3;
    this.filter.connect(wetGain);
    wetGain.connect(this.convolver);

    // LFO for filter modulation
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.15;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 200;
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.filter.frequency);
    this.lfo.start();

    this.started = true;
  }

  /**
   * Generate an impulse response for reverb.
   */
  private createReverbIR(duration: number): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * duration * 0.3));
      }
    }

    return buffer;
  }

  /**
   * Set mood by act name. Crossfades between moods.
   */
  setMood(act: string): void {
    const moodName = ACT_MOODS[act] ?? 'ambient';
    if (moodName === this.currentMood) return;
    this.currentMood = moodName;

    if (!this.ctx || !this.started || this.muted) return;

    const mood = MOODS[moodName];
    if (!mood) return;

    if (moodName === 'silent') {
      this.fadeOut(2);
      return;
    }

    this.crossfadeTo(mood, 2);
  }

  /**
   * Crossfade to a new mood profile.
   */
  private crossfadeTo(mood: MoodProfile, duration: number): void {
    if (!this.ctx || !this.filter || !this.masterGain || !this.lfo) return;
    const now = this.ctx.currentTime;

    // Stop existing oscillators
    this.oscillators.forEach(osc => {
      try { osc.stop(now + duration); } catch { /* already stopped */ }
    });
    this.gains.forEach(g => {
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0, now + duration * 0.5);
    });

    // Create new oscillators
    const newOscs: OscillatorNode[] = [];
    const newGains: GainNode[] = [];

    mood.baseFreqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      // Alternate between triangle and sine for warmth
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      // Slight detuning for richness
      osc.detune.value = (Math.random() - 0.5) * 10;

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(
        mood.volume / mood.baseFreqs.length,
        now + duration,
      );

      osc.connect(gain);
      gain.connect(this.filter!);
      osc.start(now + duration * 0.3);

      newOscs.push(osc);
      newGains.push(gain);
    });

    this.oscillators = newOscs;
    this.gains = newGains;

    // Update filter and LFO
    this.filter.frequency.linearRampToValueAtTime(mood.filterCutoff, now + duration);
    this.lfo.frequency.linearRampToValueAtTime(mood.lfoRate, now + duration);

    // Fade in master
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(mood.volume, now + duration);

    // Update reverb if needed
    if (this.convolver && mood.reverbTime !== 3) {
      this.convolver.buffer = this.createReverbIR(mood.reverbTime);
    }
  }

  /**
   * Fade out all audio.
   */
  fadeOut(duration: number = 2): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + duration);
  }

  /**
   * Resume audio after fade out.
   */
  resume(): void {
    if (this.currentMood && this.currentMood !== 'silent') {
      const mood = MOODS[this.currentMood];
      if (mood) this.crossfadeTo(mood, 1.5);
    }
  }

  /**
   * Toggle mute.
   */
  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.fadeOut(0.5);
    } else {
      this.resume();
    }
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /**
   * Cleanup.
   */
  dispose(): void {
    this.oscillators.forEach(osc => {
      try { osc.stop(); } catch { /* already stopped */ }
    });
    this.lfo?.stop();
    this.ctx?.close();
    this.ctx = null;
    this.started = false;
  }
}

export const ambientGenerator = new AmbientGenerator();
