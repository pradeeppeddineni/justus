import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParticleField } from '../../shared/ParticleField';
import { GlowText } from '../../shared/GlowText';
import type { JustUsConfig } from '../../../config/types';

interface InvitationProps {
  config: JustUsConfig;
  onReady: () => void;
}

export function Invitation({ config, onReady }: InvitationProps) {
  const targetDate = useMemo(() => new Date(config.meta.valentines_date), [config.meta.valentines_date]);
  const [now, setNow] = useState(new Date());
  const [charIndex, setCharIndex] = useState(0);

  const teaserText = config.acts.invitation.teaser_text;
  const isPast = now >= targetDate;

  // Countdown timer
  useEffect(() => {
    if (isPast) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isPast]);

  // Typewriter effect
  useEffect(() => {
    if (charIndex < teaserText.length) {
      const timeout = setTimeout(() => {
        setCharIndex(prev => prev + 1);
      }, 60 + Math.random() * 40);
      return () => clearTimeout(timeout);
    }
  }, [charIndex, teaserText]);

  // If past valentine's date, auto-advance after showing teaser
  useEffect(() => {
    if (isPast) {
      const timeout = setTimeout(onReady, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isPast, onReady]);

  const diff = targetDate.getTime() - now.getTime();
  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const hours = Math.max(0, Math.floor((diff / (1000 * 60 * 60)) % 24));
  const minutes = Math.max(0, Math.floor((diff / (1000 * 60)) % 60));
  const seconds = Math.max(0, Math.floor((diff / 1000) % 60));

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden">
      <ParticleField count={40} speed={0.15} drift="up" />

      <div className="relative z-10 flex flex-col items-center gap-12 px-8 max-w-sm">
        {/* Teaser text with typewriter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="text-center"
        >
          <p className="text-prompt text-warm leading-relaxed">
            {teaserText.slice(0, charIndex)}
            {charIndex < teaserText.length && (
              <span className="animate-cursor-blink ml-0.5">|</span>
            )}
          </p>
        </motion.div>

        {/* Countdown */}
        <AnimatePresence>
          {!isPast && charIndex >= teaserText.length && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, delay: 0.5 }}
              className="flex gap-6 text-center"
            >
              {[
                { value: days, label: 'd' },
                { value: hours, label: 'h' },
                { value: minutes, label: 'm' },
                { value: seconds, label: 's' },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center">
                  <span
                    className="font-display text-warm tabular-nums"
                    style={{ fontSize: 'clamp(1.5rem, 6vw, 2.5rem)' }}
                  >
                    {String(value).padStart(2, '0')}
                  </span>
                  <span className="text-small text-warm mt-1">{label}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* When past date */}
        {isPast && (
          <GlowText className="text-title text-warm text-center" delay={0.5}>
            It's time.
          </GlowText>
        )}
      </div>
    </div>
  );
}
