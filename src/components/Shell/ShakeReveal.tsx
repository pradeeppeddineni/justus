import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShake } from '../../hooks/useShake';
import type { ShakeMoment } from '../../config/types';

interface ShakeRevealProps {
  currentAct: string;
  currentPhase: string;
  shakeMoments: ShakeMoment[];
}

/**
 * Overlay that shows "shake for a secret" hint at configured moments,
 * and reveals bonus content on shake.
 */
export function ShakeReveal({ currentAct, currentPhase, shakeMoments }: ShakeRevealProps) {
  const [hintVisible, setHintVisible] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [revealedActs, setRevealedActs] = useState<Set<string>>(new Set());

  // Check if current act+phase matches a shake moment
  const isShakeMoment = useMemo(() => {
    return shakeMoments.some(
      m => m.act === currentAct && m.trigger_after === currentPhase
    ) && !revealedActs.has(currentAct);
  }, [currentAct, currentPhase, shakeMoments, revealedActs]);

  // Show hint after delay when at a shake moment
  useEffect(() => {
    if (isShakeMoment) {
      const timeout = setTimeout(() => setHintVisible(true), 2000);
      return () => {
        clearTimeout(timeout);
        setHintVisible(false);
        setRevealed(false);
      };
    }
  }, [isShakeMoment]);

  const handleShake = useCallback(() => {
    if (!hintVisible || revealed) return;
    setRevealed(true);
    setHintVisible(false);
    setRevealedActs(prev => new Set(prev).add(currentAct));

    // Haptic
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30]);
    }

    // Auto-hide after 4 seconds
    setTimeout(() => setRevealed(false), 4000);
  }, [hintVisible, revealed, currentAct]);

  useShake({ onShake: handleShake, threshold: 12 });

  // Bonus content per act
  const getBonusContent = (act: string): string => {
    const bonuses: Record<string, string> = {
      know_me: "Bonus: What's one question you'd never dare ask?",
      heat: "Secret dare: whisper something you've never said.",
    };
    return bonuses[act] ?? "You found a secret.";
  };

  return (
    <>
      {/* Shake hint */}
      <AnimatePresence>
        {hintVisible && (
          <motion.div
            className="fixed bottom-20 left-0 right-0 z-40 flex justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            <motion.p
              className="font-body text-warm text-center px-4"
              style={{ fontSize: '10px', letterSpacing: '0.15em', opacity: 0.2 }}
              animate={{ opacity: [0.1, 0.25, 0.1] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              shake for a secret
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revealed bonus content */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="px-8 py-6 text-center"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255,45,85,0.08), transparent 70%)',
              }}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <p
                className="font-body text-warm"
                style={{
                  fontSize: 'clamp(0.9rem, 3vw, 1.1rem)',
                  lineHeight: 1.8,
                  textShadow: '0 0 20px rgba(255, 45, 85, 0.3)',
                  opacity: 0.8,
                }}
              >
                {getBonusContent(currentAct)}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
