import { useEffect, useRef, useCallback } from 'react';

interface UseShakeOptions {
  threshold?: number;
  onShake: () => void;
  enabled?: boolean;
}

export function useShake({ threshold = 15, onShake, enabled = true }: UseShakeOptions) {
  const lastAccRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const lastShakeRef = useRef(0);
  const cooldownMs = 500;

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc?.x || !acc?.y || !acc?.z) return;

    const last = lastAccRef.current;
    if (last) {
      const delta = Math.abs(acc.x - last.x) + Math.abs(acc.y - last.y) + Math.abs(acc.z - last.z);
      if (delta > threshold) {
        const now = Date.now();
        if (now - lastShakeRef.current > cooldownMs) {
          lastShakeRef.current = now;
          onShake();
        }
      }
    }
    lastAccRef.current = { x: acc.x, y: acc.y, z: acc.z };
  }, [threshold, onShake]);

  useEffect(() => {
    if (!enabled) return;

    // Request permission on iOS 13+
    const requestPermission = async () => {
      const DeviceMotionEventWithPermission = DeviceMotionEvent as typeof DeviceMotionEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };

      if (DeviceMotionEventWithPermission.requestPermission) {
        try {
          const response = await DeviceMotionEventWithPermission.requestPermission();
          if (response !== 'granted') return;
        } catch {
          return;
        }
      }

      window.addEventListener('devicemotion', handleMotion);
    };

    requestPermission();

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [enabled, handleMotion]);
}
