import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowText } from '../../shared/GlowText';
import { PulseButton } from '../../shared/PulseButton';
import { Timer } from '../../shared/Timer';
import { TextInput } from '../../shared/TextInput';
import { ParticleField } from '../../shared/ParticleField';
import type { JustUsConfig, QuestionConfig } from '../../../config/types';
import type { PlayerId } from '../../../core/SyncEngine';

interface KnowMeProps {
  config: JustUsConfig;
  player: PlayerId;
  send: (msg: Record<string, unknown>) => void;
  onMessage: (handler: (msg: Record<string, unknown>) => void) => () => void;
  onComplete: () => void;
}

type Phase = 'intro' | 'question' | 'waiting' | 'reveal' | 'score' | 'done';

interface Reveal {
  question: string;
  p1Answer: string;
  p2Answer: string;
}

export function KnowMe({ config, player, send, onMessage, onComplete }: KnowMeProps) {
  const questions = config.acts.know_me.questions;
  const timePerQuestion = config.acts.know_me.time_per_question;

  const [phase, setPhase] = useState<Phase>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [reveals, setReveals] = useState<Reveal[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);

  const currentQuestion: QuestionConfig | undefined = questions[questionIndex];

  // Listen for server messages
  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.type === 'reveal' && msg.act === 'know_me') {
        const answers = msg.answers as { p1: string; p2: string };
        setReveals(prev => [...prev, {
          question: currentQuestion?.question ?? '',
          p1Answer: answers.p1 ?? '',
          p2Answer: answers.p2 ?? '',
        }]);
        setPhase('reveal');
      }
    });
    return unsub;
  }, [onMessage, currentQuestion]);

  // Intro → first question
  useEffect(() => {
    if (phase === 'intro') {
      const timeout = setTimeout(() => setPhase('question'), 3000);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  const handleAnswer = useCallback((text: string) => {
    setHasAnswered(true);
    send({
      type: 'answer',
      act: 'know_me',
      player,
      data: text,
    });
    setPhase('waiting');
  }, [send, player]);

  const handleTimerComplete = useCallback(() => {
    if (!hasAnswered) {
      handleAnswer('(no answer)');
    }
  }, [hasAnswered, handleAnswer]);

  const handleNextQuestion = useCallback(() => {
    const nextIndex = questionIndex + 1;
    if (nextIndex >= questions.length) {
      setPhase('score');
      return;
    }
    setQuestionIndex(nextIndex);
    setHasAnswered(false);
    setPhase('question');
  }, [questionIndex, questions.length]);

  const handleDone = useCallback(() => {
    setPhase('done');
    setTimeout(onComplete, 1500);
  }, [onComplete]);

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden">
      <ParticleField count={25} speed={0.1} drift="up" />

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
                How well do you know me?
              </GlowText>
            </motion.div>
          )}

          {/* Question */}
          {phase === 'question' && currentQuestion && (
            <motion.div
              key={`q-${questionIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              {/* Category badge */}
              <span
                className="text-xs tracking-widest uppercase font-body"
                style={{ color: 'var(--color-accent)', opacity: 0.6 }}
              >
                {currentQuestion.category}
              </span>

              {/* Question number */}
              <span className="text-small text-warm">
                {questionIndex + 1} / {questions.length}
              </span>

              {/* Question text */}
              <p className="text-subtitle text-warm text-center leading-relaxed">
                {currentQuestion.question}
              </p>

              {/* Timer */}
              <Timer
                durationSeconds={timePerQuestion}
                onComplete={handleTimerComplete}
                running={!hasAnswered}
              />

              {/* Answer input */}
              {!hasAnswered && (
                <TextInput
                  placeholder="Type your answer..."
                  onSubmit={handleAnswer}
                  maxLength={200}
                />
              )}
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
              className="text-center"
            >
              <p className="text-prompt text-warm animate-breathe">
                Waiting for their answer...
              </p>
            </motion.div>
          )}

          {/* Reveal */}
          {phase === 'reveal' && reveals.length > 0 && (
            <motion.div
              key={`reveal-${reveals.length}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              <p className="text-small text-warm opacity-50">
                {reveals[reveals.length - 1].question}
              </p>

              {/* Both answers */}
              <div className="flex flex-col gap-4 w-full">
                <div className="text-center">
                  <span className="text-xs tracking-widest uppercase opacity-40 font-body text-warm">
                    {player === 'p1' ? 'You' : 'Them'}
                  </span>
                  <p className="text-prompt text-warm mt-1">
                    "{reveals[reveals.length - 1].p1Answer}"
                  </p>
                </div>

                <div
                  className="w-12 mx-auto"
                  style={{ borderTop: '1px solid var(--color-text)', opacity: 0.1 }}
                />

                <div className="text-center">
                  <span className="text-xs tracking-widest uppercase opacity-40 font-body text-warm">
                    {player === 'p2' ? 'You' : 'Them'}
                  </span>
                  <p className="text-prompt text-warm mt-1">
                    "{reveals[reveals.length - 1].p2Answer}"
                  </p>
                </div>
              </div>

              <PulseButton onClick={handleNextQuestion}>
                {questionIndex + 1 >= questions.length ? 'finish' : 'next'}
              </PulseButton>
            </motion.div>
          )}

          {/* Score / done */}
          {phase === 'score' && (
            <motion.div
              key="score"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="flex flex-col items-center gap-6"
            >
              <GlowText as="h2" className="text-title text-warm text-center">
                {reveals.length} moments shared
              </GlowText>

              <PulseButton onClick={handleDone}>
                continue
              </PulseButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
