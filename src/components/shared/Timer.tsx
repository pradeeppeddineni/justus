import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface TimerProps {
  durationSeconds: number;
  onComplete: () => void;
  running?: boolean;
  className?: string;
}

export function Timer({ durationSeconds, onComplete, running = true, className = '' }: TimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, onComplete]);

  const progress = 1 - remaining / durationSeconds;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Circular progress */}
      <div className="relative w-10 h-10">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle
            cx="18" cy="18" r="16"
            fill="none"
            stroke="var(--color-text)"
            strokeWidth="1"
            opacity="0.1"
          />
          <motion.circle
            cx="18" cy="18" r="16"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            strokeDasharray="100.53"
            animate={{ strokeDashoffset: 100.53 * (1 - progress) }}
            transition={{ duration: 0.3 }}
            strokeLinecap="round"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-body text-xs text-warm"
          style={{ opacity: 0.7 }}
        >
          {remaining}
        </span>
      </div>
    </div>
  );
}
