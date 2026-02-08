import { useCallback } from 'react';
import { haptic } from '../core/HapticEngine';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'heartbeat';

export function useHaptic() {
  const trigger = useCallback((pattern: HapticPattern) => {
    haptic.trigger(pattern);
  }, []);

  const pulse = useCallback((durationMs?: number) => {
    haptic.pulse(durationMs);
  }, []);

  const heartbeat = useCallback(() => {
    return haptic.heartbeat();
  }, []);

  const stop = useCallback(() => {
    haptic.stop();
  }, []);

  return { trigger, pulse, heartbeat, stop };
}
