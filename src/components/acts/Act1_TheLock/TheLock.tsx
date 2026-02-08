import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParticleField } from '../../shared/ParticleField';
import { GlowText } from '../../shared/GlowText';
import type { JustUsConfig } from '../../../config/types';
import type { PlayerId } from '../../../core/SyncEngine';

interface TheLockProps {
  config: JustUsConfig;
  player: PlayerId;
  send: (msg: Record<string, unknown>) => void;
  onMessage: (handler: (msg: Record<string, unknown>) => void) => () => void;
  onComplete: () => void;
}

type LockPhase = 'instruction' | 'waiting_tap' | 'partner_tapped' | 'unlocking' | 'unlocked';

export function TheLock({ config, player, send, onMessage, onComplete }: TheLockProps) {
  const [phase, setPhase] = useState<LockPhase>('instruction');
  const [hasTapped, setHasTapped] = useState(false);
  const [partnerTapped, setPartnerTapped] = useState(false);

  const instruction = player === 'p1'
    ? config.acts.the_lock.instruction_p1
    : config.acts.the_lock.instruction_p2;

  // Listen for partner's ready signal
  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.type === 'partner_ready' && msg.act === 'the_lock') {
        setPartnerTapped(true);
        // If we already tapped, unlock; otherwise show partner_tapped
        setPhase(prev => prev === 'waiting_tap' ? 'partner_tapped' : 'unlocking');
      }
      if (msg.type === 'phase_change' && msg.act === 'the_lock' && msg.phase === 'active') {
        setPhase('unlocking');
      }
    });
    return unsub;
  }, [onMessage]);

  // Show instruction first, then waiting state
  useEffect(() => {
    const timeout = setTimeout(() => setPhase('waiting_tap'), 2500);
    return () => clearTimeout(timeout);
  }, []);

  // Unlock animation → complete
  useEffect(() => {
    if (phase === 'unlocking') {
      const timeout = setTimeout(() => {
        setPhase('unlocked');
      }, 2000);
      return () => clearTimeout(timeout);
    }
    if (phase === 'unlocked') {
      const timeout = setTimeout(onComplete, 1500);
      return () => clearTimeout(timeout);
    }
  }, [phase, onComplete]);

  const handleTap = useCallback(() => {
    if (hasTapped) return;
    setHasTapped(true);
    send({ type: 'ready', act: 'the_lock' });

    // If partner already tapped, trigger unlock
    if (partnerTapped) {
      setPhase('unlocking');
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  }, [hasTapped, send, partnerTapped]);

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden">
      <ParticleField count={30} speed={0.1} drift="up" />

      <div className="relative z-10 flex flex-col items-center gap-10 px-8 max-w-sm">
        <AnimatePresence mode="wait">
          {/* Instruction phase */}
          {phase === 'instruction' && (
            <motion.div
              key="instruction"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="text-center"
            >
              <GlowText className="text-prompt text-warm" breathe={false}>
                {instruction}
              </GlowText>
            </motion.div>
          )}

          {/* Waiting for tap */}
          {(phase === 'waiting_tap' || phase === 'partner_tapped') && (
            <motion.div
              key="tap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center gap-8"
            >
              {/* Lock icon — half heart */}
              <motion.div
                className="relative w-24 h-24 flex items-center justify-center"
                animate={phase === 'partner_tapped' ? {
                  scale: [1, 1.05, 1],
                } : undefined}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Left half of heart (this player) */}
                  <motion.path
                    d="M50 85 C50 85 15 60 15 35 C15 20 25 10 40 10 C47 10 50 15 50 20"
                    fill="none"
                    stroke={hasTapped ? 'var(--color-accent)' : 'var(--color-text)'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0.3 }}
                    animate={{
                      pathLength: 1,
                      opacity: hasTapped ? 1 : 0.3,
                    }}
                    transition={{ duration: 1.5 }}
                  />
                  {/* Right half of heart (partner) */}
                  <motion.path
                    d="M50 20 C50 15 53 10 60 10 C75 10 85 20 85 35 C85 60 50 85 50 85"
                    fill="none"
                    stroke={partnerTapped ? 'var(--color-glow)' : 'var(--color-text)'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0.15 }}
                    animate={{
                      pathLength: partnerTapped ? 1 : 0.5,
                      opacity: partnerTapped ? 1 : 0.15,
                    }}
                    transition={{ duration: 1.5 }}
                  />
                </svg>
              </motion.div>

              {/* Tap instruction */}
              {!hasTapped && (
                <motion.button
                  onClick={handleTap}
                  className="text-prompt text-warm animate-breathe cursor-pointer bg-transparent border-none"
                  whileTap={{ scale: 0.95 }}
                >
                  {phase === 'partner_tapped'
                    ? "They're waiting. Tap."
                    : 'Tap when ready'
                  }
                </motion.button>
              )}

              {hasTapped && !partnerTapped && (
                <p className="text-small text-warm">
                  Waiting for them...
                </p>
              )}
            </motion.div>
          )}

          {/* Unlocking animation */}
          {phase === 'unlocking' && (
            <motion.div
              key="unlocking"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-col items-center gap-6"
            >
              {/* Full heart */}
              <motion.svg
                viewBox="0 0 100 100"
                className="w-28 h-28"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.2, ease: 'easeInOut', repeat: 2 }}
              >
                <motion.path
                  d="M50 85 C50 85 15 60 15 35 C15 20 25 10 40 10 C47 10 50 15 50 20 C50 15 53 10 60 10 C75 10 85 20 85 35 C85 60 50 85 50 85"
                  fill="var(--color-accent)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1] }}
                  transition={{ duration: 0.8 }}
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(255, 45, 85, 0.5))',
                  }}
                />
              </motion.svg>
            </motion.div>
          )}

          {/* Unlocked */}
          {phase === 'unlocked' && (
            <motion.div
              key="unlocked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            >
              <GlowText className="text-title text-warm text-center">
                Begin.
              </GlowText>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
