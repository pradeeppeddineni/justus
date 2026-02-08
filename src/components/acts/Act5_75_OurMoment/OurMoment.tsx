import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowText } from '../../shared/GlowText';
import { PulseButton } from '../../shared/PulseButton';
import { ParticleField } from '../../shared/ParticleField';
import type { JustUsConfig } from '../../../config/types';
import type { PlayerId } from '../../../core/SyncEngine';

interface OurMomentProps {
  config: JustUsConfig;
  player: PlayerId;
  send: (msg: Record<string, unknown>) => void;
  onMessage: (handler: (msg: Record<string, unknown>) => void) => () => void;
  onComplete: () => void;
}

type Phase = 'intro' | 'camera' | 'waiting' | 'preview' | 'done';

export function OurMoment({ config, player, send, onMessage, onComplete }: OurMomentProps) {
  const momentConfig = config.acts.our_moment;
  const [phase, setPhase] = useState<Phase>('intro');
  const [myPhoto, setMyPhoto] = useState<string | null>(null);
  const [partnerPhoto, setPartnerPhoto] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoMounted, setVideoMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const myPhotoRef = useRef<string | null>(null);

  const instruction = momentConfig.instructions[player];

  // Callback ref to detect when video element mounts (after AnimatePresence exit)
  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoMounted(!!node);
  }, []);

  // Listen for partner's photo
  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.type === 'photo' && msg.player !== player) {
        setPartnerPhoto(msg.data as string);
        // If we already captured ours, go to preview
        if (myPhotoRef.current) {
          setPhase('preview');
        }
      }
    });
    return unsub;
  }, [onMessage, player]);

  // Intro
  useEffect(() => {
    if (phase === 'intro') {
      const timeout = setTimeout(() => setPhase('camera'), 3000);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  // Start camera — depends on videoMounted to re-run after AnimatePresence exit
  const startCamera = useCallback(async () => {
    setCameraError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      setCameraError(true);
    }
  }, []);

  useEffect(() => {
    if (phase !== 'camera' || !videoMounted) return;

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [phase, videoMounted, startCamera]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror the selfie camera
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setMyPhoto(dataUrl);
    myPhotoRef.current = dataUrl;

    // Stop camera
    streamRef.current?.getTracks().forEach(t => t.stop());

    // Send to partner
    send({ type: 'photo', player, data: dataUrl });

    // Haptic
    if ('vibrate' in navigator) navigator.vibrate(15);

    setPhase(partnerPhoto ? 'preview' : 'waiting');
  }, [send, player, partnerPhoto]);

  const handleDone = useCallback(() => {
    setPhase('done');
    setTimeout(onComplete, 2000);
  }, [onComplete]);

  // Download card
  const downloadCard = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0D0000';
    ctx.fillRect(0, 0, 1080, 1920);

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
      });
    };

    const renderCard = async () => {
      // Polaroid style
      const padding = 60;
      const photoWidth = 1080 - padding * 2;
      const photoHeight = 700;

      if (myPhoto) {
        const img1 = await loadImage(myPhoto);
        ctx.save();
        ctx.translate(540, 400);
        ctx.rotate(-0.03);
        ctx.fillStyle = '#FFF0F0';
        ctx.fillRect(-photoWidth / 2 - 20, -photoHeight / 2 - 20, photoWidth + 40, photoHeight + 100);
        ctx.drawImage(img1, -photoWidth / 2, -photoHeight / 2, photoWidth, photoHeight);
        ctx.restore();
      }

      if (partnerPhoto) {
        const img2 = await loadImage(partnerPhoto);
        ctx.save();
        ctx.translate(540, 1200);
        ctx.rotate(0.02);
        ctx.fillStyle = '#FFF0F0';
        ctx.fillRect(-photoWidth / 2 - 20, -photoHeight / 2 - 20, photoWidth + 40, photoHeight + 100);
        ctx.drawImage(img2, -photoWidth / 2, -photoHeight / 2, photoWidth, photoHeight);
        ctx.restore();
      }

      // Overlay text
      const overlayText = momentConfig.card_overlay.text.replace('{couple_name}', config.meta.couple_name);
      ctx.fillStyle = '#FFF0F0';
      ctx.font = '32px "Playfair Display", serif';
      ctx.textAlign = 'center';
      ctx.fillText(overlayText, 540, 1850);

      // Download
      const link = document.createElement('a');
      link.download = 'our-moment.jpg';
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    };

    renderCard();
  }, [myPhoto, partnerPhoto, config.meta.couple_name, momentConfig.card_overlay.text]);

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden">
      <ParticleField count={20} speed={0.08} drift="up" />

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
                Our Moment
              </GlowText>
            </motion.div>
          )}

          {/* Camera */}
          {phase === 'camera' && (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              <p className="text-prompt text-warm text-center">{instruction}</p>

              <div className="relative w-full overflow-hidden rounded-sm" style={{ aspectRatio: '3/4' }}>
                <video
                  ref={videoCallbackRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {cameraError && (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-small text-warm text-center" style={{ opacity: 0.6 }}>
                    Camera access is needed for this moment.
                  </p>
                  <PulseButton onClick={startCamera}>
                    allow camera
                  </PulseButton>
                </div>
              )}

              {cameraReady && !cameraError && (
                <PulseButton onClick={capturePhoto}>
                  capture
                </PulseButton>
              )}
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
              className="text-center"
            >
              <p className="text-prompt text-warm animate-breathe">
                Waiting for their photo...
              </p>
            </motion.div>
          )}

          {/* Preview */}
          {phase === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              <div className="flex gap-3 w-full">
                {myPhoto && (
                  <motion.img
                    src={myPhoto}
                    alt="You"
                    className="w-1/2 object-cover rounded-sm"
                    style={{
                      aspectRatio: '3/4',
                      border: '3px solid var(--color-text)',
                      transform: 'rotate(-2deg)',
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  />
                )}
                {partnerPhoto && (
                  <motion.img
                    src={partnerPhoto}
                    alt="Them"
                    className="w-1/2 object-cover rounded-sm"
                    style={{
                      aspectRatio: '3/4',
                      border: '3px solid var(--color-text)',
                      transform: 'rotate(1deg)',
                    }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  />
                )}
              </div>

              <p
                className="text-small text-warm text-center"
                style={{ opacity: 0.5, fontStyle: 'italic' }}
              >
                {config.acts.our_moment.card_overlay.text.replace('{couple_name}', config.meta.couple_name)}
              </p>

              <div className="flex gap-4">
                <PulseButton onClick={downloadCard} variant="ghost">
                  save
                </PulseButton>
                <PulseButton onClick={handleDone}>
                  continue
                </PulseButton>
              </div>
            </motion.div>
          )}

          {/* Done */}
          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
            >
              <GlowText className="text-title text-warm text-center">
                Beautiful.
              </GlowText>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
