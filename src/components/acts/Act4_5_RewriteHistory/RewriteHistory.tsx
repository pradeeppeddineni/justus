import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowText } from '../../shared/GlowText';
import { PulseButton } from '../../shared/PulseButton';
import { TextInput } from '../../shared/TextInput';
import { ParticleField } from '../../shared/ParticleField';
import type { JustUsConfig, RewriteMemory } from '../../../config/types';
import type { PlayerId } from '../../../core/SyncEngine';

interface RewriteHistoryProps {
  config: JustUsConfig;
  player: PlayerId;
  send: (msg: Record<string, unknown>) => void;
  onMessage: (handler: (msg: Record<string, unknown>) => void) => () => void;
  onComplete: () => void;
}

type Phase = 'intro' | 'memory' | 'writing' | 'waiting' | 'reveal' | 'transition' | 'done';

interface AnswerPair {
  memoryIndex: number;
  p1Answer: string;
  p2Answer: string;
}

export function RewriteHistory({ config, player, send, onMessage, onComplete }: RewriteHistoryProps) {
  const memories = config.acts.rewrite_history.memories;
  const totalMemories = memories.length;

  const [phase, setPhase] = useState<Phase>('intro');
  const [memoryIndex, setMemoryIndex] = useState(0);
  const [partnerAnswered, setPartnerAnswered] = useState(false);
  const [currentReveal, setCurrentReveal] = useState<AnswerPair | null>(null);
  const [allReveals, setAllReveals] = useState<AnswerPair[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);

  const currentMemory: RewriteMemory | undefined = memories[memoryIndex];

  // Listen for partner answers and reveals
  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.type === 'partner_answered' && msg.act === 'rewrite_history') {
        setPartnerAnswered(true);
      }
      if (msg.type === 'rewrite_reveal') {
        const answers = msg.answers as { p1: string; p2: string };
        const reveal: AnswerPair = {
          memoryIndex: msg.memoryIndex as number,
          p1Answer: answers.p1,
          p2Answer: answers.p2,
        };
        setCurrentReveal(reveal);
        setAllReveals(prev => [...prev, reveal]);
        setPhase('reveal');
      }
    });
    return unsub;
  }, [onMessage]);

  // Intro transition
  useEffect(() => {
    if (phase === 'intro') {
      const timeout = setTimeout(() => setPhase('memory'), 3500);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  // Memory display -> writing transition
  useEffect(() => {
    if (phase === 'memory') {
      const timeout = setTimeout(() => setPhase('writing'), 4000);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  // Format date for display
  const formatDate = useCallback((dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }, []);

  const handleSubmit = useCallback((text: string) => {
    send({
      type: 'rewrite_answer',
      player,
      memoryIndex,
      answer: text,
    });
    setPhase('waiting');
  }, [send, player, memoryIndex]);

  const handleNextMemory = useCallback(() => {
    const nextIndex = memoryIndex + 1;

    if (nextIndex >= totalMemories) {
      setPhase('done');
      setTimeout(onComplete, 2500);
      return;
    }

    // Reset state for next memory
    setMemoryIndex(nextIndex);
    setPartnerAnswered(false);
    setImageLoaded(false);
    setCurrentReveal(null);
    setPhase('transition');

    // Brief pause during transition
    setTimeout(() => setPhase('memory'), 800);
  }, [memoryIndex, totalMemories, onComplete]);

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
                Rewrite History
              </GlowText>
              <motion.p
                className="text-small text-warm mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 1 }}
              >
                What would you tell yourself back then?
              </motion.p>
            </motion.div>
          )}

          {/* Transition between memories */}
          {phase === 'transition' && (
            <motion.div
              key="transition"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <motion.div
                className="w-8 h-px mx-auto"
                style={{ backgroundColor: 'var(--color-accent)', opacity: 0.4 }}
              />
            </motion.div>
          )}

          {/* Memory display */}
          {phase === 'memory' && currentMemory && (
            <motion.div
              key={`memory-${memoryIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              {/* Progress indicator */}
              <span className="text-small text-warm" style={{ opacity: 0.4 }}>
                {memoryIndex + 1} / {totalMemories}
              </span>

              {/* Memory image (if available) */}
              {currentMemory.image && (
                <motion.div
                  className="relative w-full overflow-hidden"
                  style={{
                    maxHeight: '200px',
                    borderRadius: '2px',
                  }}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: imageLoaded ? 1 : 0, scale: 1 }}
                  transition={{ duration: 1.5 }}
                >
                  <img
                    src={currentMemory.image}
                    alt=""
                    className="w-full h-full object-cover"
                    onLoad={() => setImageLoaded(true)}
                    style={{
                      filter: 'grayscale(30%) contrast(0.9) brightness(0.8)',
                    }}
                  />
                  {/* Soft gradient overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(180deg, transparent 40%, var(--color-background) 100%)`,
                    }}
                  />
                  {/* Subtle vignette */}
                  <div
                    className="absolute inset-0"
                    style={{
                      boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.4)',
                    }}
                  />
                </motion.div>
              )}

              {/* Date */}
              <motion.span
                className="text-xs tracking-widest uppercase font-body"
                style={{ color: 'var(--color-accent)', opacity: 0.6 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.5 }}
              >
                {formatDate(currentMemory.date)}
              </motion.span>

              {/* Description */}
              <motion.p
                className="text-subtitle text-warm text-center leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
              >
                {currentMemory.description}
              </motion.p>

              {/* Loading indicator */}
              <motion.div
                className="flex gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 2 }}
              >
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: 'var(--color-text)' }}
                    animate={{ opacity: [0.2, 0.6, 0.2] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Writing phase */}
          {phase === 'writing' && currentMemory && (
            <motion.div
              key={`writing-${memoryIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              {/* Memory context (smaller) */}
              <div className="text-center">
                <span
                  className="text-xs tracking-widest uppercase font-body"
                  style={{ color: 'var(--color-accent)', opacity: 0.5 }}
                >
                  {formatDate(currentMemory.date)}
                </span>
                <p className="text-small text-warm mt-1" style={{ opacity: 0.5 }}>
                  {currentMemory.description}
                </p>
              </div>

              {/* Divider */}
              <motion.div
                className="w-8 mx-auto"
                style={{ borderTop: '1px solid var(--color-text)', opacity: 0.1 }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              />

              {/* Prompt */}
              <GlowText as="h3" className="text-prompt text-warm text-center" breathe={false}>
                If you could whisper one thing to yourself in that moment, what would it be?
              </GlowText>

              {/* Input */}
              <TextInput
                placeholder="Whisper to your past self..."
                onSubmit={handleSubmit}
                maxLength={250}
                multiline
              />
            </motion.div>
          )}

          {/* Waiting for partner */}
          {phase === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              {/* Show that my answer was sent */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
              >
                <motion.p
                  className="text-small text-warm"
                  style={{ opacity: 0.3 }}
                >
                  sent
                </motion.p>
              </motion.div>

              <motion.p
                className="text-prompt text-warm animate-breathe mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.5 }}
              >
                Waiting for their whisper...
              </motion.p>

              {partnerAnswered && (
                <motion.p
                  className="text-small text-warm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  style={{ color: 'var(--color-glow)' }}
                >
                  They've answered...
                </motion.p>
              )}
            </motion.div>
          )}

          {/* Reveal — both answers side by side */}
          {phase === 'reveal' && currentReveal && currentMemory && (
            <motion.div
              key={`reveal-${currentReveal.memoryIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              {/* Memory context */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ duration: 0.8 }}
              >
                <span
                  className="text-xs tracking-widest uppercase font-body"
                  style={{ color: 'var(--color-accent)', opacity: 0.6 }}
                >
                  {formatDate(currentMemory.date)}
                </span>
                <p className="text-small text-warm mt-1">
                  {currentMemory.description}
                </p>
              </motion.div>

              {/* Divider */}
              <motion.div
                className="w-8 mx-auto"
                style={{ borderTop: '1px solid var(--color-accent)', opacity: 0.2 }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              />

              {/* Both answers */}
              <div className="flex flex-col gap-6 w-full">
                {/* Player 1's answer */}
                <motion.div
                  className="text-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  <span
                    className="text-xs tracking-widest uppercase font-body text-warm"
                    style={{ opacity: 0.4 }}
                  >
                    {player === 'p1' ? 'you whispered' : 'they whispered'}
                  </span>
                  <motion.p
                    className="text-prompt text-warm mt-2 leading-relaxed"
                    style={{
                      textShadow: '0 0 15px rgba(255, 45, 85, 0.2)',
                      fontStyle: 'italic',
                    }}
                  >
                    "{currentReveal.p1Answer}"
                  </motion.p>
                </motion.div>

                {/* Subtle separator */}
                <motion.div
                  className="w-12 mx-auto"
                  style={{ borderTop: '1px solid var(--color-text)', opacity: 0.08 }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1, duration: 0.6 }}
                />

                {/* Player 2's answer */}
                <motion.div
                  className="text-center"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2, duration: 0.8 }}
                >
                  <span
                    className="text-xs tracking-widest uppercase font-body text-warm"
                    style={{ opacity: 0.4 }}
                  >
                    {player === 'p2' ? 'you whispered' : 'they whispered'}
                  </span>
                  <motion.p
                    className="text-prompt text-warm mt-2 leading-relaxed"
                    style={{
                      textShadow: '0 0 15px rgba(255, 107, 138, 0.2)',
                      fontStyle: 'italic',
                    }}
                  >
                    "{currentReveal.p2Answer}"
                  </motion.p>
                </motion.div>
              </div>

              {/* Next / Finish button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, duration: 0.8 }}
              >
                <PulseButton onClick={handleNextMemory}>
                  {memoryIndex + 1 >= totalMemories ? 'finish' : 'next memory'}
                </PulseButton>
              </motion.div>
            </motion.div>
          )}

          {/* Done */}
          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <GlowText as="h2" className="text-title text-warm">
                History, rewritten.
              </GlowText>

              <motion.p
                className="text-small text-warm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 0.8 }}
              >
                {allReveals.length} {allReveals.length === 1 ? 'moment' : 'moments'} revisited together.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
