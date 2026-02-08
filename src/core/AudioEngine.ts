type TrackId = 'ambient' | 'heartbeat' | 'finale';

interface AudioTrack {
  url: string;
  audio: HTMLAudioElement | null;
  loaded: boolean;
}

export class AudioEngine {
  private tracks: Map<TrackId, AudioTrack> = new Map();
  private currentTrack: TrackId | null = null;
  private _muted: boolean = false;

  register(id: TrackId, url: string) {
    this.tracks.set(id, { url, audio: null, loaded: false });
  }

  async preload(id: TrackId): Promise<void> {
    const track = this.tracks.get(id);
    if (!track || track.loaded) return;

    const audio = new Audio(track.url);
    audio.loop = id !== 'finale';
    audio.preload = 'auto';
    audio.volume = 0;

    return new Promise((resolve) => {
      audio.addEventListener('canplaythrough', () => {
        track.audio = audio;
        track.loaded = true;
        resolve();
      }, { once: true });

      audio.addEventListener('error', () => {
        // Audio failed to load — continue silently
        resolve();
      }, { once: true });

      audio.load();
    });
  }

  async play(id: TrackId, fadeInMs: number = 2000): Promise<void> {
    const track = this.tracks.get(id);
    if (!track?.audio) return;

    // Fade out current track if different
    if (this.currentTrack && this.currentTrack !== id) {
      await this.fadeOut(this.currentTrack, fadeInMs / 2);
    }

    this.currentTrack = id;
    track.audio.volume = 0;

    try {
      await track.audio.play();
    } catch {
      // Autoplay blocked — will play on next user interaction
      return;
    }

    if (this._muted) return;
    await this.fadeVolume(track.audio, 0, 0.3, fadeInMs);
  }

  async fadeOut(id: TrackId, durationMs: number = 1500): Promise<void> {
    const track = this.tracks.get(id);
    if (!track?.audio) return;

    await this.fadeVolume(track.audio, track.audio.volume, 0, durationMs);
    track.audio.pause();
    track.audio.currentTime = 0;

    if (this.currentTrack === id) {
      this.currentTrack = null;
    }
  }

  async crossfade(fromId: TrackId, toId: TrackId, durationMs: number = 3000): Promise<void> {
    const fromTrack = this.tracks.get(fromId);
    const toTrack = this.tracks.get(toId);

    if (toTrack?.audio) {
      toTrack.audio.volume = 0;
      try {
        await toTrack.audio.play();
      } catch {
        return;
      }
    }

    await Promise.all([
      fromTrack?.audio ? this.fadeVolume(fromTrack.audio, fromTrack.audio.volume, 0, durationMs) : Promise.resolve(),
      toTrack?.audio && !this._muted ? this.fadeVolume(toTrack.audio, 0, 0.3, durationMs) : Promise.resolve(),
    ]);

    if (fromTrack?.audio) {
      fromTrack.audio.pause();
      fromTrack.audio.currentTime = 0;
    }

    this.currentTrack = toId;
  }

  get muted() {
    return this._muted;
  }

  setMuted(muted: boolean) {
    this._muted = muted;
    if (this.currentTrack) {
      const track = this.tracks.get(this.currentTrack);
      if (track?.audio) {
        track.audio.volume = muted ? 0 : 0.3;
      }
    }
  }

  stopAll() {
    this.tracks.forEach((track) => {
      if (track.audio) {
        track.audio.pause();
        track.audio.currentTime = 0;
        track.audio.volume = 0;
      }
    });
    this.currentTrack = null;
  }

  private fadeVolume(audio: HTMLAudioElement, from: number, to: number, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const steps = Math.max(1, Math.floor(durationMs / 50));
      const stepSize = (to - from) / steps;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        audio.volume = Math.max(0, Math.min(1, from + stepSize * step));
        if (step >= steps) {
          clearInterval(interval);
          audio.volume = Math.max(0, Math.min(1, to));
          resolve();
        }
      }, 50);
    });
  }
}

export const audio = new AudioEngine();
