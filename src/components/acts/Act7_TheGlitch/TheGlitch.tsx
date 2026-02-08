import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { JustUsConfig } from '../../../config/types';
import type { PlayerId } from '../../../core/SyncEngine';

interface TheGlitchProps {
  config: JustUsConfig;
  player: PlayerId;
  onComplete: () => void;
}

type Phase = 'credits' | 'glitch' | 'black' | 'video' | 'end';

export function TheGlitch({ config, onComplete }: TheGlitchProps) {
  const glitchConfig = config.acts.the_glitch;
  const [phase, setPhase] = useState<Phase>('credits');
  const [creditIndex, setCreditIndex] = useState(0);
  const [glitchIntensity, setGlitchIntensity] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Credits scroll
  useEffect(() => {
    if (phase !== 'credits') return;

    const interval = setInterval(() => {
      setCreditIndex(prev => {
        if (prev >= glitchConfig.credits_text.length - 1) {
          clearInterval(interval);
          setTimeout(() => setPhase('glitch'), 2000);
          return prev;
        }
        return prev + 1;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [phase, glitchConfig.credits_text.length]);

  // Glitch effect escalation
  useEffect(() => {
    if (phase !== 'glitch') return;

    let intensity = 0;
    const interval = setInterval(() => {
      intensity += 0.1;
      setGlitchIntensity(Math.min(intensity, 1));

      if (intensity >= 1) {
        clearInterval(interval);
        // Haptic burst
        if ('vibrate' in navigator) {
          navigator.vibrate([40, 30, 40, 30, 40, 100, 60]);
        }
        setTimeout(() => setPhase('black'), 500);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [phase]);

  // Black screen → video
  useEffect(() => {
    if (phase === 'black') {
      const timeout = setTimeout(() => setPhase('video'), 2000);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  // Auto-play video
  useEffect(() => {
    if (phase === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked — user will need to tap
      });
    }
  }, [phase]);

  // Pre-compute random noise block positions (useState initializer is stable)
  const [noiseBlocks] = useState(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      width: 20 + Math.random() * 60,
      height: 2 + Math.random() * 8,
      opacity: 0.1 + Math.random() * 0.2,
      translateX: (Math.random() - 0.5) * 20,
      animX1: (Math.random() - 0.5) * 10,
      animX2: (Math.random() - 0.5) * 10,
      duration: 0.1 + Math.random() * 0.2,
    })),
  );

  const handleVideoEnd = useCallback(() => {
    setPhase('end');
    setTimeout(onComplete, 3000);
  }, [onComplete]);

  return (
    <div className="relative h-full w-full flex items-center justify-center overflow-hidden bg-surface">
      <AnimatePresence mode="wait">
        {/* Credits */}
        {phase === 'credits' && (
          <motion.div
            key="credits"
            className="flex flex-col items-center justify-center h-full w-full px-8"
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={creditIndex}
                className="font-body text-warm text-center"
                style={{ fontSize: 'clamp(1rem, 3.5vw, 1.25rem)', lineHeight: 1.8, opacity: 0.7 }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 0.7, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {glitchConfig.credits_text[creditIndex]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}

        {/* Glitch */}
        {phase === 'glitch' && (
          <motion.div
            key="glitch"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Glitch layers */}
            <div
              className="absolute inset-0"
              style={{
                background: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(255, 45, 85, ${0.03 * glitchIntensity}) 2px,
                  rgba(255, 45, 85, ${0.03 * glitchIntensity}) 4px
                )`,
                animation: glitchIntensity > 0.3 ? 'scanline 2s linear infinite' : 'none',
              }}
            />

            {/* RGB shifted text */}
            <div
              style={{
                animation: glitchIntensity > 0.5 ? 'glitchShift 0.3s infinite' : 'none',
              }}
            >
              <p
                className="font-display text-warm"
                style={{
                  fontSize: 'clamp(1.5rem, 6vw, 2.5rem)',
                  animation: glitchIntensity > 0.7 ? 'rgbSplit 0.5s infinite' : 'none',
                }}
              >
                {glitchIntensity < 0.5
                  ? 'Wait—'
                  : glitchIntensity < 0.8
                    ? 'Something is—'
                    : '▓▒░ ERROR ░▒▓'
                }
              </p>
            </div>

            {/* Random noise blocks */}
            {glitchIntensity > 0.6 && noiseBlocks.slice(0, Math.floor(glitchIntensity * 8)).map((block) => (
              <motion.div
                key={block.id}
                className="absolute"
                style={{
                  top: `${block.top}%`,
                  left: `${block.left}%`,
                  width: `${block.width}%`,
                  height: `${block.height}px`,
                  backgroundColor: `rgba(255, 45, 85, ${block.opacity})`,
                  transform: `translateX(${block.translateX}px)`,
                }}
                animate={{
                  opacity: [1, 0, 1],
                  x: [block.animX1, block.animX2],
                }}
                transition={{ duration: block.duration, repeat: Infinity }}
              />
            ))}
          </motion.div>
        )}

        {/* Black screen */}
        {phase === 'black' && (
          <motion.div
            key="black"
            className="absolute inset-0 bg-surface"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Video */}
        {phase === 'video' && (
          <motion.div
            key="video"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
          >
            <video
              ref={videoRef}
              src={glitchConfig.video_url}
              playsInline
              className="w-full h-full object-cover"
              onEnded={handleVideoEnd}
              onClick={() => videoRef.current?.play()}
              controls={false}
            />

            {/* Subtle vignette over video */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, transparent 50%, rgba(13,0,0,0.6) 100%)',
              }}
            />
          </motion.div>
        )}

        {/* End */}
        {phase === 'end' && (
          <motion.div
            key="end"
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
          >
            <p
              className="font-display text-warm text-center"
              style={{
                fontSize: 'clamp(1.5rem, 6vw, 2.5rem)',
                textShadow: '0 0 30px rgba(255, 45, 85, 0.4)',
              }}
            >
              Just us.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
