import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowText } from '../../shared/GlowText';
import { PulseButton } from '../../shared/PulseButton';
import { TextInput } from '../../shared/TextInput';
import { ParticleField } from '../../shared/ParticleField';
import type { JustUsConfig } from '../../../config/types';
import type { PlayerId } from '../../../core/SyncEngine';

interface TheUnsaidProps {
  config: JustUsConfig;
  player: PlayerId;
  send: (msg: Record<string, unknown>) => void;
  onMessage: (handler: (msg: Record<string, unknown>) => void) => () => void;
  onComplete: () => void;
}

type Phase = 'intro' | 'writing' | 'dissolving' | 'waiting' | 'reforming' | 'revealed' | 'done';

interface TextParticle {
  char: string;
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
  delay: number;
  angle: number;
  angularVelocity: number;
}

export function TheUnsaid({ config, player, send, onMessage, onComplete }: TheUnsaidProps) {
  const actConfig = config.acts.the_unsaid;
  const prompt = actConfig.prompt;
  const particleCount = actConfig.particle_count;
  const revealSpeed = actConfig.reveal_speed;

  const [phase, setPhase] = useState<Phase>('intro');
  const [myMessage, setMyMessage] = useState('');
  const [partnerMessage, setPartnerMessage] = useState('');
  const dissolveProgressRef = useRef(0);
  const reformProgressRef = useRef(0);

  const dissolveCanvasRef = useRef<HTMLCanvasElement>(null);
  const reformCanvasRef = useRef<HTMLCanvasElement>(null);
  const [reformCanvasReady, setReformCanvasReady] = useState(false);
  const dissolveParticlesRef = useRef<TextParticle[]>([]);
  const reformParticlesRef = useRef<TextParticle[]>([]);
  const dissolveAnimRef = useRef<number>(0);
  const reformAnimRef = useRef<number>(0);

  // Callback ref to detect when reform canvas actually mounts (after AnimatePresence exit)
  const reformCanvasCallback = useCallback((node: HTMLCanvasElement | null) => {
    reformCanvasRef.current = node;
    setReformCanvasReady(!!node);
  }, []);

  // Speed multiplier based on config
  const speedMultiplier = useMemo(() => {
    switch (revealSpeed) {
      case 'slow': return 0.5;
      case 'fast': return 2;
      default: return 1;
    }
  }, [revealSpeed]);

  // Listen for partner's unsaid message
  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.type === 'unsaid_reveal') {
        setPartnerMessage(msg.message as string);
      }
    });
    return unsub;
  }, [onMessage]);

  // When partner message arrives and we're waiting, trigger reform
  useEffect(() => {
    if (partnerMessage && (phase === 'waiting' || phase === 'dissolving')) {
      // Wait a moment if still dissolving
      const delay = phase === 'dissolving' ? 2000 : 500;
      const timeout = setTimeout(() => setPhase('reforming'), delay);
      return () => clearTimeout(timeout);
    }
  }, [partnerMessage, phase]);

  // Intro transition
  useEffect(() => {
    if (phase === 'intro') {
      const timeout = setTimeout(() => setPhase('writing'), 3500);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  // Generate particles from text for dissolve effect
  const generateTextParticles = useCallback((
    text: string,
    canvasWidth: number,
    canvasHeight: number,
    dissolve: boolean,
  ): TextParticle[] => {
    const particles: TextParticle[] = [];
    const chars = text.split('');
    const fontSize = Math.min(20, canvasWidth / (chars.length * 0.6 + 2));

    // Calculate text layout (centered, wrapping)
    const maxCharsPerLine = Math.floor((canvasWidth - 60) / (fontSize * 0.6));
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + ' ' + word).trim().length > maxCharsPerLine) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      }
    });
    if (currentLine.trim()) lines.push(currentLine.trim());

    const lineHeight = fontSize * 1.8;
    const totalHeight = lines.length * lineHeight;
    const startY = (canvasHeight - totalHeight) / 2;

    lines.forEach((line, lineIdx) => {
      const lineWidth = line.length * fontSize * 0.6;
      const startX = (canvasWidth - lineWidth) / 2;

      line.split('').forEach((char, charIdx) => {
        const originX = startX + charIdx * fontSize * 0.6;
        const originY = startY + lineIdx * lineHeight;

        if (dissolve) {
          // Dissolve: start at origin, drift away
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.5 + Math.random() * 2;
          particles.push({
            char,
            originX,
            originY,
            x: originX,
            y: originY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.5, // slight upward bias
            opacity: 1,
            size: fontSize,
            delay: (charIdx + lineIdx * maxCharsPerLine) * 30, // stagger
            angle: 0,
            angularVelocity: (Math.random() - 0.5) * 0.05,
          });
        } else {
          // Reform: start scattered, converge to origin
          const scatterRadius = Math.max(canvasWidth, canvasHeight) * 0.8;
          const scatterAngle = Math.random() * Math.PI * 2;
          particles.push({
            char,
            originX,
            originY,
            x: canvasWidth / 2 + Math.cos(scatterAngle) * scatterRadius * Math.random(),
            y: canvasHeight / 2 + Math.sin(scatterAngle) * scatterRadius * Math.random(),
            vx: 0,
            vy: 0,
            opacity: 0,
            size: fontSize,
            delay: (charIdx + lineIdx * maxCharsPerLine) * 40,
            angle: (Math.random() - 0.5) * Math.PI,
            angularVelocity: 0,
          });
        }
      });
    });

    // Add decorative particles (non-character)
    const extraCount = Math.max(0, particleCount - particles.length);
    for (let i = 0; i < extraCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        char: '',
        originX: canvasWidth / 2 + (Math.random() - 0.5) * canvasWidth * 0.6,
        originY: canvasHeight / 2 + (Math.random() - 0.5) * canvasHeight * 0.3,
        x: dissolve
          ? canvasWidth / 2 + (Math.random() - 0.5) * canvasWidth * 0.6
          : canvasWidth / 2 + Math.cos(angle) * canvasWidth,
        y: dissolve
          ? canvasHeight / 2 + (Math.random() - 0.5) * canvasHeight * 0.3
          : canvasHeight / 2 + Math.sin(angle) * canvasHeight,
        vx: dissolve ? (Math.random() - 0.5) * 2 : 0,
        vy: dissolve ? -Math.random() * 1.5 : 0,
        opacity: dissolve ? 0.6 : 0,
        size: 2 + Math.random() * 3,
        delay: Math.random() * 1000,
        angle: 0,
        angularVelocity: 0,
      });
    }

    return particles;
  }, [particleCount]);

  // Dissolve animation
  useEffect(() => {
    if (phase !== 'dissolving') return;

    const canvas = dissolveCanvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    dissolveParticlesRef.current = generateTextParticles(myMessage, w, h, true);
    let elapsed = 0;
    const totalDuration = 3000 / speedMultiplier;

    const animate = () => {
      elapsed += 16;
      const progress = Math.min(1, elapsed / totalDuration);
      dissolveProgressRef.current = progress;

      ctx.clearRect(0, 0, w, h);

      dissolveParticlesRef.current.forEach(p => {
        const particleTime = Math.max(0, elapsed - p.delay);
        if (particleTime <= 0) {
          // Still showing original text
          if (p.char) {
            ctx.font = `300 ${p.size}px var(--font-body)`;
            ctx.fillStyle = `rgba(255, 240, 240, ${p.opacity})`;
            ctx.fillText(p.char, p.originX, p.originY + p.size);
          }
          return;
        }

        const t = Math.min(1, particleTime / (totalDuration * 0.7));
        const eased = 1 - Math.pow(1 - t, 3); // ease out cubic

        if (p.char) {
          // Text character particle
          const x = p.originX + p.vx * eased * 100;
          const y = p.originY + p.vy * eased * 100;
          const alpha = Math.max(0, 1 - eased * 1.2);
          const rotation = p.angle + p.angularVelocity * eased * 100;

          ctx.save();
          ctx.translate(x + p.size * 0.3, y + p.size * 0.5);
          ctx.rotate(rotation);
          ctx.font = `300 ${p.size}px var(--font-body)`;
          ctx.fillStyle = `rgba(255, 240, 240, ${alpha})`;
          ctx.fillText(p.char, -p.size * 0.3, 0);
          ctx.restore();
        } else {
          // Decorative dot particle
          const x = p.x + p.vx * eased * 80;
          const y = p.y + p.vy * eased * 80;
          const alpha = Math.max(0, p.opacity * (1 - eased));

          ctx.beginPath();
          ctx.arc(x, y, p.size * (1 - eased * 0.5), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 45, 85, ${alpha})`;
          ctx.fill();
        }
      });

      if (progress < 1) {
        dissolveAnimRef.current = requestAnimationFrame(animate);
      } else {
        // Dissolve complete — go to waiting (separate effect handles transition to reforming)
        setPhase('waiting');
      }
    };

    dissolveAnimRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(dissolveAnimRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, myMessage, generateTextParticles, speedMultiplier]);

  // Reform animation — partner's message assembles from particles
  useEffect(() => {
    if (phase !== 'reforming' || !partnerMessage) return;

    const canvas = reformCanvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    reformParticlesRef.current = generateTextParticles(partnerMessage, w, h, false);
    let elapsed = 0;
    const totalDuration = 4000 / speedMultiplier;

    const animate = () => {
      elapsed += 16;
      const progress = Math.min(1, elapsed / totalDuration);
      reformProgressRef.current = progress;

      ctx.clearRect(0, 0, w, h);

      reformParticlesRef.current.forEach(p => {
        const particleTime = Math.max(0, elapsed - p.delay);
        if (particleTime <= 0) return;

        const t = Math.min(1, particleTime / (totalDuration * 0.6));
        // Spring-like easing for settling effect
        const eased = 1 - Math.pow(1 - t, 4);
        const overshoot = t < 0.9 ? 0 : Math.sin((t - 0.9) * Math.PI * 10) * 0.02 * (1 - t) * 10;

        if (p.char) {
          // Interpolate from scattered position to origin
          const x = p.x + (p.originX - p.x) * eased + overshoot * 10;
          const y = p.y + (p.originY - p.y) * eased + overshoot * 5;
          const alpha = Math.min(1, eased * 1.5);
          const rotation = p.angle * (1 - eased);

          ctx.save();
          ctx.translate(x + p.size * 0.3, y + p.size);
          ctx.rotate(rotation);
          ctx.font = `300 ${p.size}px var(--font-body)`;
          ctx.fillStyle = `rgba(255, 240, 240, ${alpha})`;

          // Add glow as particles settle
          if (eased > 0.8) {
            ctx.shadowColor = 'rgba(255, 45, 85, 0.4)';
            ctx.shadowBlur = 10 * (eased - 0.8) * 5;
          }

          ctx.fillText(p.char, -p.size * 0.3, 0);
          ctx.restore();
        } else {
          // Decorative particles converge
          const x = p.x + (p.originX - p.x) * eased;
          const y = p.y + (p.originY - p.y) * eased;
          const alpha = Math.min(0.6, eased) * (t < 0.8 ? 1 : (1 - t) * 5);

          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 45, 85, ${alpha})`;
          ctx.fill();
        }
      });

      if (progress < 1) {
        reformAnimRef.current = requestAnimationFrame(animate);
      } else {
        setPhase('revealed');
      }
    };

    // Small delay before starting
    const timeout = setTimeout(() => {
      reformAnimRef.current = requestAnimationFrame(animate);
    }, 300);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(reformAnimRef.current);
    };
  }, [phase, partnerMessage, generateTextParticles, speedMultiplier, reformCanvasReady]);

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(dissolveAnimRef.current);
      cancelAnimationFrame(reformAnimRef.current);
    };
  }, []);

  const handleSubmit = useCallback((text: string) => {
    setMyMessage(text);
    send({ type: 'unsaid', player, message: text });

    // Brief pause to let text be seen before dissolving
    setTimeout(() => setPhase('dissolving'), 800);
  }, [send, player]);

  const handleDone = useCallback(() => {
    setPhase('done');
    setTimeout(onComplete, 1500);
  }, [onComplete]);

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden">
      <ParticleField count={15} speed={0.06} drift="up" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-8 max-w-sm w-full h-full justify-center">
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
                The Unsaid
              </GlowText>
              <motion.p
                className="text-small text-warm mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 1 }}
              >
                Some words live just beneath the surface.
              </motion.p>
            </motion.div>
          )}

          {/* Writing */}
          {phase === 'writing' && (
            <motion.div
              key="writing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center gap-8 w-full"
            >
              <GlowText as="h3" className="text-subtitle text-warm text-center" breathe={false}>
                {prompt}
              </GlowText>

              <motion.p
                className="text-small text-warm text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 0.5 }}
              >
                This message will dissolve into the space between you, then reform as theirs arrives.
              </motion.p>

              <TextInput
                placeholder="Type what was left unsaid..."
                onSubmit={handleSubmit}
                maxLength={300}
                multiline
              />
            </motion.div>
          )}

          {/* Dissolving — canvas takes over */}
          {phase === 'dissolving' && (
            <motion.div
              key="dissolving"
              initial={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <canvas
                ref={dissolveCanvasRef}
                className="absolute inset-0 w-full h-full"
              />

              {/* Ambient glow during dissolve */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{
                  background: [
                    'radial-gradient(ellipse at center, rgba(255, 45, 85, 0) 0%, transparent 70%)',
                    'radial-gradient(ellipse at center, rgba(255, 45, 85, 0.08) 0%, transparent 70%)',
                    'radial-gradient(ellipse at center, rgba(255, 45, 85, 0) 0%, transparent 70%)',
                  ],
                }}
                transition={{ duration: 3, ease: 'easeInOut' }}
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
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <motion.p
                className="text-prompt text-warm"
                animate={{
                  opacity: [0.3, 0.7, 0.3],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                Your words have dissolved into the ether...
              </motion.p>

              <motion.p
                className="text-small text-warm mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 1 }}
              >
                Waiting for their unsaid words to arrive.
              </motion.p>

              {/* Floating dots to indicate waiting */}
              <motion.div className="flex justify-center gap-2 mt-8">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                    animate={{
                      y: [0, -8, 0],
                      opacity: [0.3, 0.8, 0.3],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Reforming — partner's message assembles */}
          {phase === 'reforming' && (
            <motion.div
              key="reforming"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <canvas
                ref={reformCanvasCallback}
                className="absolute inset-0 w-full h-full"
              />

              {/* Subtle label */}
              <motion.div
                className="absolute z-10"
                style={{ top: 'calc(var(--safe-area-top) + 20px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 1 }}
              >
                <p className="text-xs tracking-widest uppercase font-body text-warm">
                  from them
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* Revealed — show partner's message clearly */}
          {phase === 'revealed' && (
            <motion.div
              key="revealed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="flex flex-col items-center gap-8 text-center w-full"
            >
              <motion.p
                className="text-xs tracking-widest uppercase font-body text-warm"
                style={{ opacity: 0.4 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
              >
                they said
              </motion.p>

              <motion.p
                className="text-subtitle text-warm leading-relaxed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 1 }}
                style={{
                  textShadow: '0 0 20px rgba(255, 45, 85, 0.3)',
                }}
              >
                "{partnerMessage}"
              </motion.p>

              {/* Divider */}
              <motion.div
                className="w-12 mx-auto"
                style={{ borderTop: '1px solid var(--color-text)', opacity: 0.1 }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              />

              <motion.p
                className="text-xs tracking-widest uppercase font-body text-warm"
                style={{ opacity: 0.4 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 1 }}
              >
                you said
              </motion.p>

              <motion.p
                className="text-prompt text-warm"
                style={{ opacity: 0.6 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 1.2, duration: 0.8 }}
              >
                "{myMessage}"
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
              >
                <PulseButton onClick={handleDone}>
                  continue
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
              transition={{ duration: 1.2 }}
            >
              <GlowText className="text-title text-warm text-center">
                Now it's been said.
              </GlowText>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
