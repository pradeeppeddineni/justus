import { useEffect, useCallback, useRef, useState } from 'react';
import { ambientGenerator } from '../core/AmbientGenerator';

/**
 * React hook for ambient music that responds to act changes.
 * Initializes on first user gesture and crossfades between moods.
 */
export function useAmbient(currentAct: string) {
  const [muted, setMuted] = useState(false);
  const initializedRef = useRef(false);

  // Initialize on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (initializedRef.current) return;
      initializedRef.current = true;
      ambientGenerator.init().then(() => {
        ambientGenerator.setMood(currentAct);
      });
      // Remove listeners after first init
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('click', initAudio);
    };

    document.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('click', initAudio, { once: true });

    return () => {
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('click', initAudio);
    };
  }, [currentAct]);

  // Update mood when act changes
  useEffect(() => {
    if (initializedRef.current) {
      ambientGenerator.setMood(currentAct);
    }
  }, [currentAct]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ambientGenerator.dispose();
    };
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = ambientGenerator.toggleMute();
    setMuted(newMuted);
    return newMuted;
  }, []);

  return { muted, toggleMute };
}
