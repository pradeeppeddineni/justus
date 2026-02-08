import { useState, useCallback, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';

interface TextInputProps {
  placeholder?: string;
  onSubmit: (text: string) => void;
  maxLength?: number;
  multiline?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function TextInput({
  placeholder = 'Type here...',
  onSubmit,
  maxLength = 500,
  multiline = false,
  className = '',
  autoFocus = true,
}: TextInputProps) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.target.value.length <= maxLength) {
      setText(e.target.value);
    }
  }, [maxLength]);

  const handleSubmit = useCallback(() => {
    if (text.trim() && !submitted) {
      setSubmitted(true);
      onSubmit(text.trim());
    }
  }, [text, submitted, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const sharedStyles: React.CSSProperties = {
    backgroundColor: 'transparent',
    borderBottom: '1px solid rgba(255, 240, 240, 0.15)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-body)',
    fontSize: '1.125rem',
    fontWeight: 300,
    letterSpacing: '0.02em',
    lineHeight: 1.7,
    padding: '12px 0',
    transition: 'border-color 800ms ease',
  };

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <motion.div
      className={`w-full ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <InputComponent
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={submitted}
        className="w-full outline-none resize-none placeholder:opacity-30"
        style={{
          ...sharedStyles,
          opacity: submitted ? 0.5 : 1,
          ...(multiline ? { minHeight: '120px' } : {}),
        }}
        rows={multiline ? 4 : undefined}
      />

      {text.trim() && !submitted && (
        <motion.button
          onClick={handleSubmit}
          className="mt-4 font-body text-warm text-sm tracking-widest uppercase opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          whileHover={{ opacity: 1 }}
          style={{ background: 'none', border: 'none' }}
        >
          send
        </motion.button>
      )}

      {maxLength && (
        <div
          className="mt-1 text-right font-body text-xs"
          style={{ opacity: text.length > maxLength * 0.8 ? 0.5 : 0.15 }}
        >
          {text.length}/{maxLength}
        </div>
      )}
    </motion.div>
  );
}
