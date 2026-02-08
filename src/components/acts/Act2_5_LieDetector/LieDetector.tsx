import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowText } from '../../shared/GlowText';
import { PulseButton } from '../../shared/PulseButton';
import { ParticleField } from '../../shared/ParticleField';
import type { JustUsConfig, MemoryPair } from '../../../config/types';
import type { PlayerId } from '../../../core/SyncEngine';

interface LieDetectorProps {
  config: JustUsConfig;
  player: PlayerId;
  send: (msg: Record<string, unknown>) => void;
  onMessage: (handler: (msg: Record<string, unknown>) => void) => () => void;
  onComplete: () => void;
}

type Phase = 'intro' | 'storytelling' | 'guessing' | 'result' | 'done';

const ROASTS = {
  correct_fast: [
    "They know you too well.",
    "Not even close to fooling them.",
    "You're an open book.",
  ],
  correct_slow: [
    "They figured it out... eventually.",
    "A little doubt, but the truth wins.",
    "That hesitation though.",
  ],
  wrong: [
    "Fooled. Completely fooled.",
    "They bought it. You magnificent liar.",
    "The acting career is looking promising.",
  ],
};

export function LieDetector({ config, player, send, onMessage, onComplete }: LieDetectorProps) {
  const memories = config.acts.lie_detector.memories;
  const [phase, setPhase] = useState<Phase>('intro');
  const [roundIndex, setRoundIndex] = useState(0);
  const [chosenOption, setChosenOption] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: boolean; hesitationMs: number; roast: string } | null>(null);
  const guessStartRef = useRef(0);

  const currentMemory: MemoryPair | undefined = memories[roundIndex];
  const isTeller = currentMemory?.who_tells === player;

  // Randomize which option is displayed first
  const options = useMemo(() => {
    if (!currentMemory) return [];
    return Math.random() > 0.5
      ? [
          { text: currentMemory.real, isReal: true },
          { text: currentMemory.fake, isReal: false },
        ]
      : [
          { text: currentMemory.fake, isReal: false },
          { text: currentMemory.real, isReal: true },
        ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex]);

  // Listen for results
  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.type === 'lie_detector_result') {
        const guess = msg.guess as number;
        const hesitationMs = msg.hesitationMs as number;
        const correct = options[guess]?.isReal ?? false;

        let roastPool: string[];
        if (correct && hesitationMs < 3000) {
          roastPool = ROASTS.correct_fast;
        } else if (correct) {
          roastPool = ROASTS.correct_slow;
        } else {
          roastPool = ROASTS.wrong;
        }

        setResult({
          correct,
          hesitationMs,
          roast: roastPool[Math.floor(Math.random() * roastPool.length)],
        });
        setPhase('result');
      }
    });
    return unsub;
  }, [onMessage, options]);

  // Intro
  useEffect(() => {
    if (phase === 'intro') {
      const timeout = setTimeout(() => setPhase('storytelling'), 3000);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  // Start guess timer when guessing phase begins
  useEffect(() => {
    if (phase === 'guessing') {
      guessStartRef.current = Date.now();
    }
  }, [phase]);

  const handleTellerReady = useCallback(() => {
    send({ type: 'ready', act: 'lie_detector' });
    setPhase('guessing');
  }, [send]);

  const handleGuess = useCallback((optionIndex: number) => {
    if (chosenOption !== null) return;
    setChosenOption(optionIndex);
    const hesitationMs = Date.now() - guessStartRef.current;
    send({
      type: 'lie_detector_guess',
      player,
      round: roundIndex,
      guess: optionIndex,
      hesitationMs,
    });
  }, [chosenOption, send, player, roundIndex]);

  const handleNextRound = useCallback(() => {
    const nextIndex = roundIndex + 1;
    if (nextIndex >= memories.length) {
      setPhase('done');
      setTimeout(onComplete, 2000);
      return;
    }
    setRoundIndex(nextIndex);
    setChosenOption(null);
    setResult(null);
    setPhase('storytelling');
  }, [roundIndex, memories.length, onComplete]);

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden">
      <ParticleField count={20} speed={0.08} drift="up" />

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
                The Lie Detector
              </GlowText>
              <motion.p
                className="text-small text-warm mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 1 }}
              >
                One truth. One lie. Can they tell?
              </motion.p>
            </motion.div>
          )}

          {/* Storytelling / Guessing */}
          {(phase === 'storytelling' || phase === 'guessing') && currentMemory && (
            <motion.div
              key={`round-${roundIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              <span className="text-small text-warm opacity-40">
                Round {roundIndex + 1} / {memories.length}
              </span>

              {isTeller ? (
                // Teller view
                <div className="flex flex-col items-center gap-6 w-full">
                  <p className="text-prompt text-warm text-center">
                    Tell them both versions. Watch their face.
                  </p>

                  <div className="flex flex-col gap-4 w-full">
                    <div className="p-4" style={{ borderLeft: '2px solid var(--color-accent)', opacity: 0.8 }}>
                      <p className="text-small text-warm uppercase tracking-widest opacity-40 mb-2">Real</p>
                      <p className="text-prompt text-warm">{currentMemory.real}</p>
                    </div>
                    <div className="p-4" style={{ borderLeft: '2px solid var(--color-glow)', opacity: 0.8 }}>
                      <p className="text-small text-warm uppercase tracking-widest opacity-40 mb-2">Fake</p>
                      <p className="text-prompt text-warm">{currentMemory.fake}</p>
                    </div>
                  </div>

                  {phase === 'storytelling' && (
                    <PulseButton onClick={handleTellerReady}>
                      I've told them both
                    </PulseButton>
                  )}

                  {phase === 'guessing' && (
                    <p className="text-small text-warm animate-breathe">
                      They're deciding...
                    </p>
                  )}
                </div>
              ) : (
                // Guesser view
                <div className="flex flex-col items-center gap-6 w-full">
                  <p className="text-prompt text-warm text-center">
                    Which one is real?
                  </p>

                  {phase === 'storytelling' && (
                    <p className="text-small text-warm animate-breathe">
                      Listen carefully...
                    </p>
                  )}

                  {phase === 'guessing' && options.map((option, i) => (
                    <motion.button
                      key={i}
                      onClick={() => handleGuess(i)}
                      disabled={chosenOption !== null}
                      className="w-full text-left p-4 cursor-pointer bg-transparent"
                      style={{
                        border: `1px solid ${chosenOption === i ? 'var(--color-accent)' : 'rgba(255,240,240,0.1)'}`,
                        opacity: chosenOption !== null && chosenOption !== i ? 0.3 : 1,
                        transition: 'all 600ms ease',
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <p className="text-prompt text-warm">{option.text}</p>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Result */}
          {phase === 'result' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <GlowText as="h3" className="text-title text-warm">
                {result.correct ? 'Caught.' : 'Fooled.'}
              </GlowText>

              <p className="text-prompt text-warm opacity-70">
                {result.roast}
              </p>

              {result.hesitationMs > 0 && (
                <p className="text-small text-warm opacity-30">
                  Hesitation: {(result.hesitationMs / 1000).toFixed(1)}s
                </p>
              )}

              <PulseButton onClick={handleNextRound}>
                {roundIndex + 1 >= memories.length ? 'finish' : 'next round'}
              </PulseButton>
            </motion.div>
          )}

          {/* Done */}
          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
            >
              <GlowText className="text-title text-warm text-center">
                The truth always comes out.
              </GlowText>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
