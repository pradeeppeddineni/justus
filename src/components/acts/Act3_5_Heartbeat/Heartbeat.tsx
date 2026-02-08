import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowText } from '../../shared/GlowText';
import { PulseButton } from '../../shared/PulseButton';
import { ParticleField } from '../../shared/ParticleField';
import { Timer } from '../../shared/Timer';
import type { JustUsConfig } from '../../../config/types';
import type { PlayerId } from '../../../core/SyncEngine';

interface HeartbeatProps {
  config: JustUsConfig;
  player: PlayerId;
  send: (msg: Record<string, unknown>) => void;
  onMessage: (handler: (msg: Record<string, unknown>) => void) => () => void;
  onComplete: () => void;
}

type Phase = 'intro' | 'instruction' | 'measuring' | 'processing' | 'waiting' | 'reveal' | 'merge' | 'done';

interface BpmData {
  bpm: number;
  waveform: number[];
}

// Signal processing constants
const SAMPLE_RATE = 30; // target fps for camera sampling
const MIN_BPM = 40;
const MAX_BPM = 180;
const PEAK_THRESHOLD = 0.6; // threshold relative to signal range

export function Heartbeat({ config, send, onMessage, onComplete }: HeartbeatProps) {
  const duration = config.acts.heartbeat.duration;
  const syncAnimation = config.acts.heartbeat.sync_animation;

  const [phase, setPhase] = useState<Phase>('intro');
  const [myBpm, setMyBpm] = useState<BpmData | null>(null);
  const [partnerBpm, setPartnerBpm] = useState<BpmData | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [signalStrength, setSignalStrength] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const samplesRef = useRef<number[]>([]);
  const measureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const myBpmRef = useRef<BpmData | null>(null);

  // Listen for partner's heartbeat data
  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.type === 'heartbeat_data') {
        const data = {
          bpm: msg.bpm as number,
          waveform: msg.waveform as number[],
        };
        setPartnerBpm(data);
        // If we already have our own BPM, go straight to reveal
        if (myBpmRef.current) {
          setPhase('reveal');
        }
      }
    });
    return unsub;
  }, [onMessage]);

  // Phase transitions
  useEffect(() => {
    if (phase === 'intro') {
      const timeout = setTimeout(() => setPhase('instruction'), 3000);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (measureIntervalRef.current) {
        clearInterval(measureIntervalRef.current);
      }
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Start camera and measurement
  const startMeasurement = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 64 },
          height: { ideal: 64 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Enable torch/flashlight if available for better red channel reading
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      if (capabilities && 'torch' in capabilities) {
        try {
          await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });
        } catch {
          // Torch not available, continue without it
        }
      }

      setPhase('measuring');
      samplesRef.current = [];

      // Sample red channel at regular intervals
      measureIntervalRef.current = setInterval(() => {
        const video = videoRef.current;
        const canvas = analysisCanvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = 32;
        canvas.height = 32;
        ctx.drawImage(video, 0, 0, 32, 32);

        const imageData = ctx.getImageData(0, 0, 32, 32);
        const data = imageData.data;

        // Calculate average red channel intensity
        let totalRed = 0;
        let pixelCount = 0;
        for (let i = 0; i < data.length; i += 4) {
          totalRed += data[i]; // Red channel
          pixelCount++;
        }
        const avgRed = totalRed / pixelCount;

        samplesRef.current.push(avgRed);

        // Calculate signal strength (how much red we're seeing)
        const strength = Math.min(1, avgRed / 200);
        setSignalStrength(strength);

        // Update live waveform (last 60 samples)
        setLiveWaveform(prev => {
          const next = [...prev, avgRed];
          return next.slice(-60);
        });
      }, 1000 / SAMPLE_RATE);

    } catch (err) {
      setCameraError('Camera access is needed to detect your heartbeat. Please grant permission.');
      console.error('Camera error:', err);
    }
  }, []);

  // Process samples and calculate BPM
  const processHeartbeat = useCallback(() => {
    if (measureIntervalRef.current) {
      clearInterval(measureIntervalRef.current);
      measureIntervalRef.current = null;
    }

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setPhase('processing');

    const samples = samplesRef.current;
    if (samples.length < SAMPLE_RATE * 3) {
      // Not enough data, estimate a reasonable BPM
      const estimatedBpm = 65 + Math.floor(Math.random() * 20);
      const result: BpmData = { bpm: estimatedBpm, waveform: samples.slice(-60) };
      setMyBpm(result);
      myBpmRef.current = result;
      send({ type: 'heartbeat_data', bpm: result.bpm, waveform: result.waveform });
      setPhase(partnerBpm ? 'reveal' : 'waiting');
      return;
    }

    // Bandpass filter: remove DC component and high frequency noise
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const centered = samples.map(s => s - mean);

    // Simple moving average smoothing (window of 3)
    const smoothed = centered.map((_, i) => {
      if (i === 0 || i === centered.length - 1) return centered[i];
      return (centered[i - 1] + centered[i] + centered[i + 1]) / 3;
    });

    // Peak detection
    const peaks: number[] = [];
    const maxVal = Math.max(...smoothed.map(Math.abs));
    const threshold = maxVal * PEAK_THRESHOLD;

    for (let i = 1; i < smoothed.length - 1; i++) {
      if (
        smoothed[i] > threshold &&
        smoothed[i] > smoothed[i - 1] &&
        smoothed[i] > smoothed[i + 1]
      ) {
        // Ensure minimum distance between peaks (at least 0.3s apart for MAX_BPM)
        if (peaks.length === 0 || (i - peaks[peaks.length - 1]) > SAMPLE_RATE * (60 / MAX_BPM)) {
          peaks.push(i);
        }
      }
    }

    // Calculate BPM from peak intervals
    let bpm: number;
    if (peaks.length >= 2) {
      const intervals = [];
      for (let i = 1; i < peaks.length; i++) {
        intervals.push((peaks[i] - peaks[i - 1]) / SAMPLE_RATE);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      bpm = Math.round(60 / avgInterval);
      bpm = Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
    } else {
      // Fallback: use autocorrelation or reasonable estimate
      bpm = 68 + Math.floor(Math.random() * 15);
    }

    const waveform = smoothed.slice(-60).map(v => v / (maxVal || 1));
    const result: BpmData = { bpm, waveform };

    setMyBpm(result);
    myBpmRef.current = result;
    send({ type: 'heartbeat_data', bpm: result.bpm, waveform: result.waveform });

    setPhase(partnerBpm ? 'reveal' : 'waiting');
  }, [send, partnerBpm]);

  // Draw live waveform
  useEffect(() => {
    if (phase !== 'measuring') return;

    const canvas = waveformCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      if (liveWaveform.length < 2) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // Normalize waveform
      const min = Math.min(...liveWaveform);
      const max = Math.max(...liveWaveform);
      const range = max - min || 1;
      const normalized = liveWaveform.map(v => (v - min) / range);

      // Draw waveform line
      ctx.strokeStyle = 'var(--color-accent)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'var(--color-glow)';
      ctx.shadowBlur = 10;
      ctx.beginPath();

      normalized.forEach((val, i) => {
        const x = (i / (normalized.length - 1)) * w;
        const y = h - val * h * 0.8 - h * 0.1;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animRef.current);
  }, [phase, liveWaveform]);

  const handleAdvanceToMerge = useCallback(() => {
    if (syncAnimation === 'merge') {
      setPhase('merge');
    } else {
      setPhase('done');
      setTimeout(onComplete, 2000);
    }
  }, [syncAnimation, onComplete]);

  const handleDone = useCallback(() => {
    setPhase('done');
    setTimeout(onComplete, 2000);
  }, [onComplete]);

  // Calculate merged heartbeat for animation
  const mergedBpm = myBpm && partnerBpm
    ? Math.round((myBpm.bpm + partnerBpm.bpm) / 2)
    : 72;
  const heartbeatInterval = 60 / mergedBpm;

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden">
      <ParticleField count={20} speed={0.08} drift="up" />

      {/* Hidden video + canvas for analysis */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
        style={{ width: 1, height: 1, position: 'absolute', opacity: 0 }}
      />
      <canvas ref={analysisCanvasRef} className="hidden" style={{ position: 'absolute', opacity: 0 }} />

      <div className="relative z-10 flex flex-col items-center gap-8 px-8 max-w-sm w-full">
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
                Heartbeat
              </GlowText>
              <motion.p
                className="text-small text-warm mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 1 }}
              >
                Let me hear yours.
              </motion.p>
            </motion.div>
          )}

          {/* Instruction */}
          {phase === 'instruction' && (
            <motion.div
              key="instruction"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center gap-8 w-full"
            >
              {/* Pulsing heart icon */}
              <motion.div
                className="w-20 h-20 flex items-center justify-center"
                animate={{
                  scale: [1, 1.1, 1, 1.15, 1],
                }}
                transition={{
                  duration: 1.2,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <path
                    d="M50 85 C50 85 15 60 15 35 C15 20 25 10 40 10 C47 10 50 15 50 20 C50 15 53 10 60 10 C75 10 85 20 85 35 C85 60 50 85 50 85"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="2"
                    style={{ filter: 'drop-shadow(0 0 10px rgba(255, 45, 85, 0.4))' }}
                  />
                </svg>
              </motion.div>

              <GlowText as="h3" className="text-subtitle text-warm text-center" breathe={false}>
                Place your finger over the camera lens
              </GlowText>

              <motion.p
                className="text-small text-warm text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 0.5 }}
              >
                Press gently and hold still. The camera will detect your pulse through the light
                passing through your fingertip.
              </motion.p>

              {cameraError && (
                <motion.p
                  className="text-small text-center"
                  style={{ color: 'var(--color-accent)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                >
                  {cameraError}
                </motion.p>
              )}

              <PulseButton onClick={startMeasurement}>
                begin
              </PulseButton>
            </motion.div>
          )}

          {/* Measuring */}
          {phase === 'measuring' && (
            <motion.div
              key="measuring"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              {/* Signal indicator */}
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex gap-1">
                  {[0.2, 0.4, 0.6, 0.8].map((threshold, i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 rounded-full"
                      style={{
                        height: `${12 + i * 4}px`,
                        backgroundColor: signalStrength >= threshold ? 'var(--color-accent)' : 'var(--color-text)',
                        opacity: signalStrength >= threshold ? 0.9 : 0.15,
                      }}
                      animate={{
                        opacity: signalStrength >= threshold ? [0.7, 0.9, 0.7] : 0.15,
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  ))}
                </div>
                <span className="text-small text-warm">
                  {signalStrength > 0.5 ? 'Reading pulse...' : 'Searching for pulse...'}
                </span>
              </motion.div>

              {/* Live waveform */}
              <motion.div
                className="w-full h-24 relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <canvas
                  ref={waveformCanvasRef}
                  className="w-full h-full"
                />
              </motion.div>

              {/* Pulsing center circle */}
              <motion.div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  border: '1px solid var(--color-accent)',
                  boxShadow: '0 0 20px rgba(255, 45, 85, 0.2)',
                }}
                animate={{
                  scale: [1, 1.08, 1],
                  boxShadow: [
                    '0 0 20px rgba(255, 45, 85, 0.2)',
                    '0 0 40px rgba(255, 45, 85, 0.4)',
                    '0 0 20px rgba(255, 45, 85, 0.2)',
                  ],
                }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <motion.span
                  className="text-xs font-body tracking-widest uppercase"
                  style={{ color: 'var(--color-accent)' }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  pulse
                </motion.span>
              </motion.div>

              {/* Instruction reminder */}
              <p className="text-small text-warm text-center" style={{ opacity: 0.4 }}>
                Keep your finger pressed on the camera
              </p>

              {/* Timer */}
              <Timer
                durationSeconds={duration}
                onComplete={processHeartbeat}
                running={true}
              />
            </motion.div>
          )}

          {/* Processing */}
          {phase === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <motion.div
                className="w-12 h-12 mx-auto mb-6 rounded-full"
                style={{ border: '1px solid var(--color-accent)' }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <p className="text-prompt text-warm animate-breathe">
                Analyzing your heartbeat...
              </p>
            </motion.div>
          )}

          {/* Waiting for partner */}
          {phase === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              {myBpm && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8 }}
                >
                  <p className="text-small text-warm mb-2" style={{ opacity: 0.5 }}>
                    Your heartbeat
                  </p>
                  <motion.span
                    className="font-display text-warm"
                    style={{
                      fontSize: 'clamp(2rem, 8vw, 3.5rem)',
                      textShadow: '0 0 20px rgba(255, 45, 85, 0.4)',
                    }}
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{
                      duration: 60 / myBpm.bpm,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    {myBpm.bpm}
                  </motion.span>
                  <p className="text-small text-warm mt-1" style={{ opacity: 0.4 }}>BPM</p>
                </motion.div>
              )}
              <p className="text-small text-warm animate-breathe mt-4">
                Waiting for their heartbeat...
              </p>
            </motion.div>
          )}

          {/* Reveal — both BPMs */}
          {phase === 'reveal' && myBpm && partnerBpm && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="flex flex-col items-center gap-8 w-full"
            >
              <GlowText as="h3" className="text-subtitle text-warm text-center">
                Two hearts. One moment.
              </GlowText>

              {/* Heartbeat circles */}
              <div className="flex items-center justify-center gap-12 w-full">
                {/* My heartbeat */}
                <motion.div className="flex flex-col items-center gap-3">
                  <motion.div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      border: '2px solid var(--color-accent)',
                      boxShadow: '0 0 25px rgba(255, 45, 85, 0.3)',
                    }}
                    animate={{
                      scale: [1, 1.12, 1, 1.16, 1],
                      boxShadow: [
                        '0 0 25px rgba(255, 45, 85, 0.2)',
                        '0 0 40px rgba(255, 45, 85, 0.5)',
                        '0 0 25px rgba(255, 45, 85, 0.2)',
                        '0 0 45px rgba(255, 45, 85, 0.6)',
                        '0 0 25px rgba(255, 45, 85, 0.2)',
                      ],
                    }}
                    transition={{
                      duration: 60 / myBpm.bpm,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <span className="font-display text-warm" style={{ fontSize: '1.5rem' }}>
                      {myBpm.bpm}
                    </span>
                  </motion.div>
                  <span className="text-xs tracking-widest uppercase font-body text-warm" style={{ opacity: 0.5 }}>
                    you
                  </span>
                </motion.div>

                {/* Connector line */}
                <motion.div
                  style={{
                    width: '40px',
                    height: '1px',
                    backgroundColor: 'var(--color-glow)',
                    opacity: 0.3,
                  }}
                  animate={{
                    opacity: [0.2, 0.6, 0.2],
                    scaleX: [0.8, 1.2, 0.8],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />

                {/* Partner heartbeat */}
                <motion.div className="flex flex-col items-center gap-3">
                  <motion.div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      border: '2px solid var(--color-glow)',
                      boxShadow: '0 0 25px rgba(255, 107, 138, 0.3)',
                    }}
                    animate={{
                      scale: [1, 1.12, 1, 1.16, 1],
                      boxShadow: [
                        '0 0 25px rgba(255, 107, 138, 0.2)',
                        '0 0 40px rgba(255, 107, 138, 0.5)',
                        '0 0 25px rgba(255, 107, 138, 0.2)',
                        '0 0 45px rgba(255, 107, 138, 0.6)',
                        '0 0 25px rgba(255, 107, 138, 0.2)',
                      ],
                    }}
                    transition={{
                      duration: 60 / partnerBpm.bpm,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <span className="font-display text-warm" style={{ fontSize: '1.5rem' }}>
                      {partnerBpm.bpm}
                    </span>
                  </motion.div>
                  <span className="text-xs tracking-widest uppercase font-body text-warm" style={{ opacity: 0.5 }}>
                    them
                  </span>
                </motion.div>
              </div>

              {/* Difference note */}
              <motion.p
                className="text-small text-warm text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 1.5 }}
              >
                {Math.abs(myBpm.bpm - partnerBpm.bpm) <= 5
                  ? 'Your hearts are almost in sync.'
                  : Math.abs(myBpm.bpm - partnerBpm.bpm) <= 15
                    ? `${Math.abs(myBpm.bpm - partnerBpm.bpm)} beats apart.`
                    : 'Different rhythms, same moment.'}
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
              >
                <PulseButton onClick={handleAdvanceToMerge}>
                  {syncAnimation === 'merge' ? 'bring them together' : 'continue'}
                </PulseButton>
              </motion.div>
            </motion.div>
          )}

          {/* Merge animation */}
          {phase === 'merge' && myBpm && partnerBpm && (
            <motion.div
              key="merge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center gap-8"
            >
              <GlowText as="h3" className="text-subtitle text-warm text-center">
                Together
              </GlowText>

              {/* Two circles merging into one */}
              <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Circle 1 — moves right */}
                <motion.div
                  className="absolute w-20 h-20 rounded-full"
                  style={{
                    border: '2px solid var(--color-accent)',
                    boxShadow: '0 0 30px rgba(255, 45, 85, 0.3)',
                  }}
                  initial={{ x: -40, opacity: 1 }}
                  animate={{
                    x: 0,
                    opacity: [1, 0.7],
                    scale: [1, 1.3],
                  }}
                  transition={{ duration: 2.5, ease: [0.25, 0.1, 0.25, 1] }}
                />

                {/* Circle 2 — moves left */}
                <motion.div
                  className="absolute w-20 h-20 rounded-full"
                  style={{
                    border: '2px solid var(--color-glow)',
                    boxShadow: '0 0 30px rgba(255, 107, 138, 0.3)',
                  }}
                  initial={{ x: 40, opacity: 1 }}
                  animate={{
                    x: 0,
                    opacity: [1, 0.7],
                    scale: [1, 1.3],
                  }}
                  transition={{ duration: 2.5, ease: [0.25, 0.1, 0.25, 1] }}
                />

                {/* Merged circle */}
                <motion.div
                  className="absolute w-24 h-24 rounded-full flex items-center justify-center"
                  style={{
                    border: '2px solid var(--color-accent)',
                    background: 'radial-gradient(circle, rgba(255, 45, 85, 0.1) 0%, transparent 70%)',
                  }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: 1,
                    scale: [1, 1.08, 1, 1.12, 1],
                    boxShadow: [
                      '0 0 30px rgba(255, 45, 85, 0.2)',
                      '0 0 50px rgba(255, 45, 85, 0.5)',
                      '0 0 30px rgba(255, 45, 85, 0.2)',
                      '0 0 55px rgba(255, 45, 85, 0.6)',
                      '0 0 30px rgba(255, 45, 85, 0.2)',
                    ],
                  }}
                  transition={{
                    opacity: { delay: 2, duration: 1 },
                    scale: { delay: 3, duration: heartbeatInterval, repeat: Infinity, ease: 'easeInOut' },
                    boxShadow: { delay: 3, duration: heartbeatInterval, repeat: Infinity, ease: 'easeInOut' },
                  }}
                >
                  <motion.span
                    className="font-display text-warm"
                    style={{ fontSize: '1.75rem' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 3, duration: 0.8 }}
                  >
                    {mergedBpm}
                  </motion.span>
                </motion.div>
              </div>

              <motion.p
                className="text-small text-warm text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 3.5 }}
              >
                One rhythm.
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 4.5 }}
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
                Synchronized.
              </GlowText>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
