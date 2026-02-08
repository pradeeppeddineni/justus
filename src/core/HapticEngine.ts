type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'heartbeat';

const patterns: Record<HapticPattern, number[]> = {
  light: [10],
  medium: [20],
  heavy: [40],
  success: [10, 50, 15],
  warning: [20, 30, 20],
  error: [40, 30, 40, 30, 40],
  heartbeat: [15, 100, 30, 300],
};

export class HapticEngine {
  private supported: boolean;

  constructor() {
    this.supported = 'vibrate' in navigator;
  }

  trigger(pattern: HapticPattern) {
    if (!this.supported) return;
    navigator.vibrate(patterns[pattern]);
  }

  pulse(durationMs: number = 15) {
    if (!this.supported) return;
    navigator.vibrate(durationMs);
  }

  heartbeat() {
    if (!this.supported) return;
    // Repeating heartbeat: thump-thump ... thump-thump
    const beat = () => {
      navigator.vibrate(patterns.heartbeat);
    };
    beat();
    const interval = setInterval(beat, 1200);
    return () => clearInterval(interval);
  }

  stop() {
    if (!this.supported) return;
    navigator.vibrate(0);
  }
}

export const haptic = new HapticEngine();
