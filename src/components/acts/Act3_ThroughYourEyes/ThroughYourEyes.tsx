import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowText } from '../../shared/GlowText';
import { PulseButton } from '../../shared/PulseButton';
import { ParticleField } from '../../shared/ParticleField';
import type { JustUsConfig } from '../../../config/types';
import type { PlayerId } from '../../../core/SyncEngine';

interface ThroughYourEyesProps {
  config: JustUsConfig;
  player: PlayerId;
  send: (msg: Record<string, unknown>) => void;
  onMessage: (handler: (msg: Record<string, unknown>) => void) => () => void;
  onComplete: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
}

type Phase = 'intro' | 'drawing' | 'waiting' | 'overlay' | 'done';

export function ThroughYourEyes({ config, player, send, onMessage, onComplete }: ThroughYourEyesProps) {
  const actConfig = config.acts.through_your_eyes;
  const totalRounds = actConfig.rounds;
  const prompt = actConfig.prompt;
  const myColor = player === 'p1' ? actConfig.stroke_color_p1 : actConfig.stroke_color_p2;

  const [phase, setPhase] = useState<Phase>('intro');
  const [currentRound, setCurrentRound] = useState(0);
  const [myStrokes, setMyStrokes] = useState<Stroke[]>([]);
  const [partnerStrokes, setPartnerStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [showOverlayReady, setShowOverlayReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const partnerCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  // Get canvas dimensions accounting for safe areas
  const getCanvasSize = useCallback(() => {
    if (!containerRef.current) return { width: window.innerWidth, height: window.innerHeight };
    const rect = containerRef.current.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }, []);

  // Initialize canvases
  const setupCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = getCanvasSize();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
    }
  }, [getCanvasSize]);

  // Setup canvases on mount and resize
  useEffect(() => {
    const handleResize = () => {
      setupCanvas(canvasRef.current);
      setupCanvas(partnerCanvasRef.current);
      setupCanvas(overlayCanvasRef.current);
      redrawAllStrokes();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupCanvas]);

  // Draw a stroke on a canvas
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke, alpha: number = 1) => {
    if (stroke.points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Add subtle glow
    ctx.shadowColor = stroke.color;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    // Use quadratic curves for smooth strokes
    if (stroke.points.length === 2) {
      ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
    } else {
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
        const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
      }
      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x, last.y);
    }

    ctx.stroke();
    ctx.restore();
  }, []);

  // Redraw all strokes on both canvases
  const redrawAllStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    const partnerCanvas = partnerCanvasRef.current;
    if (!canvas || !partnerCanvas) return;

    const ctx = canvas.getContext('2d');
    const pCtx = partnerCanvas.getContext('2d');
    if (!ctx || !pCtx) return;

    const { width, height } = getCanvasSize();
    ctx.clearRect(0, 0, width, height);
    pCtx.clearRect(0, 0, width, height);

    myStrokes.forEach(s => drawStroke(ctx, s));
    partnerStrokes.forEach(s => drawStroke(pCtx, s));
  }, [myStrokes, partnerStrokes, drawStroke, getCanvasSize]);

  // Listen for partner strokes and round completion
  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.type === 'draw_stroke') {
        const incomingStroke: Stroke = {
          points: msg.points as Point[],
          color: msg.color as string,
        };
        setPartnerStrokes(prev => [...prev, incomingStroke]);

        // Draw immediately on partner canvas
        const pCanvas = partnerCanvasRef.current;
        if (pCanvas) {
          const pCtx = pCanvas.getContext('2d');
          if (pCtx) {
            drawStroke(pCtx, incomingStroke);
          }
        }
      }

      if (msg.type === 'round_complete') {
        setShowOverlayReady(true);
      }
    });
    return unsub;
  }, [onMessage, drawStroke]);

  // Intro timer
  useEffect(() => {
    if (phase === 'intro') {
      const timeout = setTimeout(() => setPhase('drawing'), 3500);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  // Build overlay animation when entering overlay phase
  useEffect(() => {
    if (phase !== 'overlay') return;

    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    setupCanvas(overlay);
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    const allStrokes = [...myStrokes, ...partnerStrokes];
    let strokeIdx = 0;
    let pointIdx = 0;
    const speed = 3; // points per frame

    const animateOverlay = () => {
      if (strokeIdx >= allStrokes.length) {
        cancelAnimationFrame(animRef.current);
        return;
      }

      const stroke = allStrokes[strokeIdx];
      const endPoint = Math.min(pointIdx + speed, stroke.points.length);

      // Draw segment
      if (pointIdx === 0 && endPoint >= 2) {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = 12;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      }

      for (let i = Math.max(1, pointIdx); i < endPoint; i++) {
        if (i === 1) {
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        }
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();

      pointIdx = endPoint;

      if (pointIdx >= stroke.points.length) {
        strokeIdx++;
        pointIdx = 0;
      }

      animRef.current = requestAnimationFrame(animateOverlay);
    };

    // Small delay before animation starts
    const timeout = setTimeout(() => {
      animRef.current = requestAnimationFrame(animateOverlay);
    }, 500);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(animRef.current);
    };
  }, [phase, myStrokes, partnerStrokes, setupCanvas]);

  // Get pointer position relative to canvas
  const getPointerPos = useCallback((e: React.TouchEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  }, []);

  // Drawing handlers
  const handleDrawStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (phase !== 'drawing') return;
    e.preventDefault();
    const pos = getPointerPos(e);
    setIsDrawing(true);
    setCurrentPoints([pos]);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = myColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = myColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      }
    }
  }, [phase, getPointerPos, myColor]);

  const handleDrawMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || phase !== 'drawing') return;
    e.preventDefault();
    const pos = getPointerPos(e);
    setCurrentPoints(prev => [...prev, pos]);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      }
    }
  }, [isDrawing, phase, getPointerPos]);

  const handleDrawEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPoints.length >= 2) {
      const stroke: Stroke = { points: [...currentPoints], color: myColor };
      setMyStrokes(prev => [...prev, stroke]);

      // Send stroke to partner
      send({
        type: 'draw_stroke',
        points: currentPoints,
        color: myColor,
      });
    }

    setCurrentPoints([]);
  }, [isDrawing, currentPoints, myColor, send]);

  // Handle round completion
  const handleRoundDone = useCallback(() => {
    send({ type: 'round_done', player, round: currentRound });
    setPhase('waiting');
  }, [send, player, currentRound]);

  // Check if all rounds are complete
  useEffect(() => {
    if (!showOverlayReady) return;
    const nextRound = currentRound + 1;

    if (nextRound >= totalRounds) {
      setPhase('overlay');
    } else {
      setCurrentRound(nextRound);
      setMyStrokes([]);
      setPartnerStrokes([]);
      setShowOverlayReady(false);

      // Clear canvases
      const canvas = canvasRef.current;
      const pCanvas = partnerCanvasRef.current;
      if (canvas && pCanvas) {
        const ctx = canvas.getContext('2d');
        const pCtx = pCanvas.getContext('2d');
        const { width, height } = getCanvasSize();
        if (ctx) ctx.clearRect(0, 0, width, height);
        if (pCtx) pCtx.clearRect(0, 0, width, height);
      }

      setPhase('drawing');
    }
  }, [showOverlayReady, currentRound, totalRounds, getCanvasSize]);

  const handleDone = useCallback(() => {
    setPhase('done');
    setTimeout(onComplete, 1500);
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden safe-area"
      style={{ backgroundColor: actConfig.canvas_bg || 'var(--color-background)' }}
    >
      <AnimatePresence mode="wait">
        {/* Intro Phase */}
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-20 px-8"
          >
            <ParticleField count={30} speed={0.12} drift="up" />
            <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm">
              <GlowText as="h2" className="text-title text-warm text-center">
                Through Your Eyes
              </GlowText>
              <motion.p
                className="text-prompt text-warm text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 1, duration: 1 }}
              >
                {prompt}
              </motion.p>
              <motion.p
                className="text-small text-warm text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 2, duration: 1 }}
              >
                Draw with your finger. Your partner sees their own canvas.
              </motion.p>
            </div>
          </motion.div>
        )}

        {/* Drawing Phase */}
        {(phase === 'drawing' || phase === 'waiting') && (
          <motion.div
            key={`drawing-${currentRound}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-10"
          >
            {/* Round indicator */}
            <motion.div
              className="absolute top-0 left-0 right-0 flex justify-between items-center px-6 z-20"
              style={{ paddingTop: 'calc(var(--safe-area-top) + 12px)' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <span className="text-small text-warm">
                {currentRound + 1} / {totalRounds}
              </span>
              <span
                className="text-small font-body"
                style={{ color: myColor, opacity: 0.8 }}
              >
                your color
              </span>
            </motion.div>

            {/* Prompt text */}
            <motion.div
              className="absolute top-0 left-0 right-0 flex justify-center z-20"
              style={{ paddingTop: 'calc(var(--safe-area-top) + 44px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <p className="text-small text-warm text-center px-8 max-w-xs">
                {prompt}
              </p>
            </motion.div>

            {/* My drawing canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full z-10"
              style={{ touchAction: 'none' }}
              onMouseDown={handleDrawStart}
              onMouseMove={handleDrawMove}
              onMouseUp={handleDrawEnd}
              onMouseLeave={handleDrawEnd}
              onTouchStart={handleDrawStart}
              onTouchMove={handleDrawMove}
              onTouchEnd={handleDrawEnd}
              onTouchCancel={handleDrawEnd}
            />

            {/* Partner strokes canvas (rendered below mine) */}
            <canvas
              ref={partnerCanvasRef}
              className="absolute inset-0 w-full h-full z-5 pointer-events-none"
              style={{ opacity: 0.6 }}
            />

            {/* Done button */}
            {phase === 'drawing' && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 flex justify-center z-20"
                style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 24px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
              >
                <PulseButton onClick={handleRoundDone} variant="ghost">
                  done
                </PulseButton>
              </motion.div>
            )}

            {/* Waiting state */}
            {phase === 'waiting' && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 flex justify-center z-20"
                style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 24px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                <p className="text-small text-warm animate-breathe">
                  Waiting for their drawing...
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Overlay Phase — combined drawing reveal */}
        {phase === 'overlay' && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0 z-10"
          >
            {/* Combined canvas */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full"
            />

            {/* Glow backdrop */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              transition={{ delay: 1, duration: 2 }}
              style={{
                background: `radial-gradient(ellipse at center, var(--color-glow) 0%, transparent 70%)`,
              }}
            />

            {/* Title overlay */}
            <motion.div
              className="absolute top-0 left-0 right-0 flex justify-center z-20"
              style={{ paddingTop: 'calc(var(--safe-area-top) + 20px)' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
            >
              <GlowText as="h3" className="text-subtitle text-warm text-center">
                Your drawings, together
              </GlowText>
            </motion.div>

            {/* Done button */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 flex justify-center z-20"
              style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 24px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 1 }}
            >
              <PulseButton onClick={handleDone}>
                continue
              </PulseButton>
            </motion.div>
          </motion.div>
        )}

        {/* Done Phase */}
        {phase === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
            className="flex flex-col items-center justify-center"
          >
            <ParticleField count={40} speed={0.15} drift="up" />
            <GlowText className="text-title text-warm text-center relative z-10">
              Two perspectives. One vision.
            </GlowText>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
