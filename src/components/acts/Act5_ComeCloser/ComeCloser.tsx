import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowText } from '../../shared/GlowText';
import { PulseButton } from '../../shared/PulseButton';
import { ParticleField } from '../../shared/ParticleField';
import type { JustUsConfig, ComeCloserPrompt } from '../../../config/types';
import type { PlayerId } from '../../../core/SyncEngine';

interface ComeCloserProps {
  config: JustUsConfig;
  player: PlayerId;
  send: (msg: Record<string, unknown>) => void;
  onMessage: (handler: (msg: Record<string, unknown>) => void) => () => void;
  onComplete: () => void;
}

type Phase = 'intro' | 'instruction' | 'action' | 'waiting' | 'done';

export function ComeCloser({ config, player, send, onMessage, onComplete }: ComeCloserProps) {
  const prompts = config.acts.come_closer.prompts;
  const [promptIndex, setPromptIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [countdown, setCountdown] = useState(0);

  const currentPrompt: ComeCloserPrompt | undefined = prompts[promptIndex];

  const handleNext = useCallback(() => {
    const nextIndex = promptIndex + 1;
    if (nextIndex >= prompts.length) {
      setPhase('done');
      setTimeout(onComplete, 2000);
      return;
    }
    setPromptIndex(nextIndex);
    setPhase('instruction');
  }, [promptIndex, prompts.length, onComplete]);

  // Listen for shake events to resume
  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.type === 'shake' && phase === 'waiting') {
        handleNext();
      }
    });
    return unsub;
  }, [onMessage, phase, handleNext]);

  // Intro
  useEffect(() => {
    if (phase === 'intro') {
      const timeout = setTimeout(() => setPhase('instruction'), 3000);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  // Countdown for timed actions
  useEffect(() => {
    if (phase !== 'action' || !currentPrompt?.duration) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, currentPrompt, handleNext]);

  // Transition from instruction to action
  const handleInstructionDone = useCallback(() => {
    if (currentPrompt?.resume_trigger) {
      setPhase('waiting');
    } else {
      if (currentPrompt?.duration) {
        setCountdown(currentPrompt.duration);
      }
      setPhase('action');
    }
  }, [currentPrompt]);

  const handleShake = useCallback(() => {
    send({ type: 'shake', player });
    handleNext();
  }, [send, player, handleNext]);

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden">
      <ParticleField count={15} speed={0.05} drift="up" />

      <div className="relative z-10 flex flex-col items-center gap-10 px-8 max-w-sm w-full">
        <AnimatePresence mode="wait">
          {/* Intro */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="text-center"
            >
              <GlowText as="h2" className="text-title text-warm">
                Come Closer
              </GlowText>
            </motion.div>
          )}

          {/* Instruction */}
          {phase === 'instruction' && currentPrompt && (
            <motion.div
              key={`inst-${promptIndex}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center gap-8 text-center"
            >
              <p className="text-subtitle text-warm leading-relaxed">
                {currentPrompt.instruction}
              </p>

              <PulseButton onClick={handleInstructionDone}>
                ready
              </PulseButton>
            </motion.div>
          )}

          {/* Action — timed */}
          {phase === 'action' && currentPrompt && (
            <motion.div
              key={`action-${promptIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center gap-8 text-center"
            >
              <GlowText className="text-prompt text-warm leading-relaxed">
                {currentPrompt.then}
              </GlowText>

              {countdown > 0 && (
                <motion.span
                  className="font-display text-warm tabular-nums"
                  style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', opacity: 0.3 }}
                  key={countdown}
                  initial={{ scale: 1.2, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 0.3 }}
                  transition={{ duration: 0.6 }}
                >
                  {countdown}
                </motion.span>
              )}
            </motion.div>
          )}

          {/* Waiting — shake/tap to resume */}
          {phase === 'waiting' && currentPrompt && (
            <motion.div
              key={`wait-${promptIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="flex flex-col items-center gap-10 text-center"
            >
              <GlowText className="text-subtitle text-warm leading-relaxed">
                {currentPrompt.then}
              </GlowText>

              <motion.p
                className="text-small text-warm"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {currentPrompt.resume_trigger === 'shake'
                  ? 'Shake to continue'
                  : 'Tap to continue'}
              </motion.p>

              {currentPrompt.resume_trigger === 'tap' && (
                <PulseButton onClick={handleShake} variant="ghost">
                  continue
                </PulseButton>
              )}
            </motion.div>
          )}

          {/* Done */}
          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
            >
              <GlowText className="text-title text-warm text-center">
                Closer.
              </GlowText>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
