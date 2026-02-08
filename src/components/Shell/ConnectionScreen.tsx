import { motion } from 'framer-motion';
import type { ConnectionStatus } from '../../core/SyncEngine';

interface ConnectionScreenProps {
  status: ConnectionStatus;
  partnerConnected: boolean;
}

export function ConnectionScreen({ status, partnerConnected }: ConnectionScreenProps) {
  if (status === 'connected' && partnerConnected) return null;

  let message = 'Connecting...';
  if (status === 'connected' && !partnerConnected) {
    message = 'Waiting for them...';
  } else if (status === 'reconnecting') {
    message = 'Reconnecting...';
  } else if (status === 'disconnected') {
    message = 'Connection lost...';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface">
      <motion.div
        className="flex flex-col items-center gap-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Breathing dot */}
        <motion.div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: 'var(--color-accent)' }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 3.5,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        />

        <p className="font-body-light text-prompt text-warm opacity-60">
          {message}
        </p>
      </motion.div>
    </div>
  );
}
