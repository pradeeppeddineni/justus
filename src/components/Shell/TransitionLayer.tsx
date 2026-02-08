import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface TransitionLayerProps {
  actKey: string;
  children: ReactNode;
}

export function TransitionLayer({ actKey, children }: TransitionLayerProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={actKey}
        className="w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 1.2,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
