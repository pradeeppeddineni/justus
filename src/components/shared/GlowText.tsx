import { motion } from 'framer-motion';
import { useMemo, type ReactNode } from 'react';

interface GlowTextProps {
  children: ReactNode;
  className?: string;
  breathe?: boolean;
  delay?: number;
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'span';
}

// Pre-create motion components for allowed tags
const motionTags = {
  p: motion.p,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  span: motion.span,
} as const;

export function GlowText({
  children,
  className = '',
  breathe = true,
  delay = 0,
  as = 'p',
}: GlowTextProps) {
  const MotionTag = motionTags[as];

  const animateProps = useMemo(() => ({
    opacity: 1,
    y: 0,
    ...(breathe ? {
      textShadow: [
        '0 0 10px rgba(255, 45, 85, 0.3)',
        '0 0 20px rgba(255, 45, 85, 0.5), 0 0 40px rgba(255, 107, 138, 0.2)',
        '0 0 10px rgba(255, 45, 85, 0.3)',
      ],
    } : {}),
  }), [breathe]);

  return (
    <MotionTag
      className={className}
      style={{
        textShadow: '0 0 20px rgba(255, 45, 85, 0.3), 0 0 40px rgba(255, 107, 138, 0.1)',
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={animateProps}
      transition={{
        opacity: { duration: 1.2, delay },
        y: { duration: 1.2, delay },
        textShadow: breathe ? {
          duration: 3.5,
          ease: 'easeInOut',
          repeat: Infinity,
          delay,
        } : undefined,
      }}
    >
      {children}
    </MotionTag>
  );
}
