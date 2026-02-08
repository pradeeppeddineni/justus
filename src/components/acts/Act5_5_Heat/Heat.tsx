import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowText } from '../../shared/GlowText';
import { PulseButton } from '../../shared/PulseButton';
import { TextInput } from '../../shared/TextInput';
import { ParticleField } from '../../shared/ParticleField';
import type { JustUsConfig } from '../../../config/types';
import type { PlayerId } from '../../../core/SyncEngine';

interface HeatProps {
  config: JustUsConfig;
  player: PlayerId;
  send: (msg: Record<string, unknown>) => void;
  onMessage: (handler: (msg: Record<string, unknown>) => void) => () => void;
  onComplete: () => void;
}

type Phase = 'intro' | 'truth_prompt' | 'choosing' | 'answering' | 'forfeit' | 'partner_result' | 'done';
type Intensity = 'mild' | 'medium' | 'spicy' | 'fire';

const INTENSITY_ORDER: Intensity[] = ['mild', 'medium', 'spicy', 'fire'];

export function Heat({ config, player, send, onMessage, onComplete }: HeatProps) {
  const heatConfig = config.acts.heat;
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(0);
  const [currentTruth, setCurrentTruth] = useState('');
  const [currentIntensity, setCurrentIntensity] = useState<Intensity>(heatConfig.intensity as Intensity);
  const [partnerChoice, setPartnerChoice] = useState<{ choice: string; answer?: string } | null>(null);
  const [forfeitText, setForfeitText] = useState('');

  // Derive whose turn it is (alternating)
  const isMyTurn = useMemo(() => round % 2 === (player === 'p1' ? 0 : 1), [round, player]);

  // Pick a truth question based on current intensity
  const pickTruth = useCallback(() => {
    const pool = heatConfig.truths[currentIntensity];
    if (!pool || pool.length === 0) return '';
    return pool[Math.floor(Math.random() * pool.length)];
  }, [heatConfig.truths, currentIntensity]);

  // Listen for partner's choice
  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.type === 'heat_choice') {
        setPartnerChoice({
          choice: msg.choice as string,
          answer: msg.answer as string | undefined,
        });
        setPhase('partner_result');
      }
    });
    return unsub;
  }, [onMessage]);

  // Intro
  useEffect(() => {
    if (phase === 'intro') {
      const timeout = setTimeout(() => {
        setCurrentTruth(pickTruth());
        setPhase('truth_prompt');
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [phase, pickTruth]);

  // Auto-escalate intensity
  const escalate = useCallback(() => {
    if (heatConfig.escalation !== 'auto') return;
    const currentIdx = INTENSITY_ORDER.indexOf(currentIntensity);
    const escalateEvery = Math.max(1, Math.floor(heatConfig.rounds / INTENSITY_ORDER.length));
    if (round > 0 && round % escalateEvery === 0 && currentIdx < INTENSITY_ORDER.length - 1) {
      setCurrentIntensity(INTENSITY_ORDER[currentIdx + 1]);
    }
  }, [heatConfig.escalation, heatConfig.rounds, currentIntensity, round]);

  const pickForfeit = useCallback((choice: string): string => {
    const forfeits = heatConfig.forfeits;
    if (choice === 'strip') return forfeits.strip.text;
    if (choice === 'kiss') {
      const pool = forfeits.kiss.prompts;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    if (choice === 'intimate') {
      const pool = forfeits.intimate.prompts[currentIntensity];
      if (pool && pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
      return forfeits.intimate.prompts.mild[0] ?? '';
    }
    return '';
  }, [heatConfig.forfeits, currentIntensity]);

  const handleChoice = useCallback((choice: 'truth' | 'strip' | 'kiss' | 'intimate') => {
    if (choice === 'truth') {
      setPhase('answering');
    } else {
      const text = pickForfeit(choice);
      setForfeitText(text);
      send({ type: 'heat_choice', player, round, choice });
      setPhase('forfeit');
    }
  }, [pickForfeit, send, player, round]);

  const nextRound = useCallback(() => {
    const next = round + 1;
    if (next >= heatConfig.rounds) {
      setPhase('done');
      setTimeout(onComplete, 2000);
      return;
    }
    setRound(next);
    escalate();
    setCurrentTruth(pickTruth());
    setPartnerChoice(null);
    setPhase('truth_prompt');
  }, [round, heatConfig.rounds, onComplete, escalate, pickTruth]);

  const handleTruthAnswer = useCallback((answer: string) => {
    send({ type: 'heat_choice', player, round, choice: 'truth', answer });
    nextRound();
  }, [send, player, round, nextRound]);

  // Background intensity colors
  const intensityGlow = useMemo(() => {
    const map: Record<Intensity, string> = {
      mild: 'rgba(255, 45, 85, 0.05)',
      medium: 'rgba(255, 45, 85, 0.1)',
      spicy: 'rgba(255, 45, 85, 0.15)',
      fire: 'rgba(255, 45, 85, 0.25)',
    };
    return map[currentIntensity];
  }, [currentIntensity]);

  return (
    <div
      className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden transition-colors"
      style={{
        background: `radial-gradient(ellipse at center, ${intensityGlow}, var(--color-background))`,
        transition: 'background 2s ease',
      }}
    >
      <ParticleField
        count={currentIntensity === 'fire' ? 80 : currentIntensity === 'spicy' ? 50 : 25}
        speed={currentIntensity === 'fire' ? 0.4 : 0.15}
        drift="up"
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-8 max-w-sm w-full">
        <AnimatePresence mode="wait">
          {/* Intro */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="text-center"
            >
              <GlowText as="h2" className="text-title text-warm">
                Heat
              </GlowText>
              <motion.p
                className="text-small text-warm mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 1 }}
              >
                Truth... or consequences.
              </motion.p>
            </motion.div>
          )}

          {/* Truth prompt + choices */}
          {phase === 'truth_prompt' && (
            <motion.div
              key={`truth-${round}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              {/* Round & intensity */}
              <div className="flex items-center gap-3">
                <span className="text-small text-warm opacity-40">
                  {round + 1}/{heatConfig.rounds}
                </span>
                <span
                  className="text-xs tracking-widest uppercase font-body"
                  style={{ color: 'var(--color-accent)', opacity: 0.6 }}
                >
                  {currentIntensity}
                </span>
              </div>

              {isMyTurn ? (
                <>
                  <p className="text-subtitle text-warm text-center leading-relaxed">
                    {currentTruth}
                  </p>

                  <div className="flex flex-col gap-3 w-full mt-4">
                    <PulseButton onClick={() => handleChoice('truth')}>
                      truth
                    </PulseButton>
                    <PulseButton onClick={() => handleChoice('strip')} variant="ghost">
                      strip
                    </PulseButton>
                    <PulseButton onClick={() => handleChoice('kiss')} variant="ghost">
                      kiss
                    </PulseButton>
                    {(currentIntensity === 'spicy' || currentIntensity === 'fire') && (
                      <PulseButton onClick={() => handleChoice('intimate')} variant="ghost">
                        intimate
                      </PulseButton>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-prompt text-warm animate-breathe">
                    Their turn...
                  </p>
                  <p className="text-small text-warm mt-2 opacity-40">
                    Watch their face.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Answering truth */}
          {phase === 'answering' && (
            <motion.div
              key="answering"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              <p className="text-prompt text-warm text-center opacity-70">
                {currentTruth}
              </p>
              <TextInput
                placeholder="Type your truth..."
                onSubmit={handleTruthAnswer}
                maxLength={500}
                multiline
              />
            </motion.div>
          )}

          {/* Forfeit */}
          {phase === 'forfeit' && (
            <motion.div
              key="forfeit"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center gap-8 text-center"
            >
              <GlowText className="text-subtitle text-warm leading-relaxed">
                {forfeitText}
              </GlowText>

              <motion.p
                className="text-small text-warm"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Shake when ready
              </motion.p>

              <PulseButton onClick={nextRound} variant="ghost">
                continue
              </PulseButton>
            </motion.div>
          )}

          {/* Partner's result */}
          {phase === 'partner_result' && partnerChoice && (
            <motion.div
              key="partner-result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              {partnerChoice.choice === 'truth' && partnerChoice.answer ? (
                <>
                  <p className="text-small text-warm opacity-40">They chose truth</p>
                  <GlowText className="text-prompt text-warm leading-relaxed">
                    "{partnerChoice.answer}"
                  </GlowText>
                </>
              ) : (
                <GlowText className="text-subtitle text-warm">
                  They chose {partnerChoice.choice}.
                </GlowText>
              )}

              <PulseButton onClick={nextRound}>
                {round + 1 >= heatConfig.rounds ? 'finish' : 'next round'}
              </PulseButton>
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
                Things are heating up.
              </GlowText>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
