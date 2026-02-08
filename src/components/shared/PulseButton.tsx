import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PulseButtonProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}

export function PulseButton({
  children,
  onClick,
  className = '',
  disabled = false,
  variant = 'primary',
}: PulseButtonProps) {
  const baseStyles = variant === 'primary'
    ? 'px-8 py-4 border border-accent/30 rounded-none bg-transparent'
    : 'px-6 py-3 bg-transparent';

  return (
    <motion.button
      className={`${baseStyles} font-body text-warm cursor-pointer ${className}`}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.96 }}
      animate={!disabled ? {
        boxShadow: [
          '0 0 20px rgba(255, 45, 85, 0.1)',
          '0 0 30px rgba(255, 45, 85, 0.25)',
          '0 0 20px rgba(255, 45, 85, 0.1)',
        ],
      } : undefined}
      transition={{
        boxShadow: {
          duration: 3.5,
          ease: 'easeInOut',
          repeat: Infinity,
        },
      }}
      style={{
        opacity: disabled ? 0.3 : 1,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        fontSize: '0.75rem',
      }}
    >
      {children}
    </motion.button>
  );
}
