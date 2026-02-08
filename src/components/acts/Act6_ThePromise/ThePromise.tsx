import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { GlowText } from '../../shared/GlowText';
import { TextInput } from '../../shared/TextInput';
import type { JustUsConfig } from '../../../config/types';
import type { PlayerId } from '../../../core/SyncEngine';

interface ThePromiseProps {
  config: JustUsConfig;
  player: PlayerId;
  send: (msg: Record<string, unknown>) => void;
  onMessage: (handler: (msg: Record<string, unknown>) => void) => () => void;
  onComplete: () => void;
}

type Phase = 'intro' | 'starfield' | 'naming' | 'waiting' | 'reveal' | 'done';

export function ThePromise({ config, player, send, onMessage, onComplete }: ThePromiseProps) {
  const promiseConfig = config.acts.the_promise;
  const [phase, setPhase] = useState<Phase>('intro');
  const [starName, setStarName] = useState<{ p1Word: string; p2Word: string } | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);

  // Listen for star naming result
  useEffect(() => {
    const unsub = onMessage((msg) => {
      if (msg.type === 'partner_star_word') {
        // Partner submitted, waiting for us or we already did
      }
      if (msg.type === 'star_named') {
        setStarName({
          p1Word: msg.p1Word as string,
          p2Word: msg.p2Word as string,
        });
        setPhase('reveal');
      }
    });
    return unsub;
  }, [onMessage]);

  // Intro → starfield
  useEffect(() => {
    if (phase === 'intro') {
      const timeout = setTimeout(() => setPhase('starfield'), 3000);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  // Starfield → naming after 5s
  useEffect(() => {
    if (phase === 'starfield') {
      const timeout = setTimeout(() => setPhase('naming'), 5000);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  // Three.js star field
  useEffect(() => {
    if (phase === 'intro') return;
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Stars
    const starCount = promiseConfig.star_field_density;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      sizes[i] = Math.random() * 2 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xfff0f0,
      size: 0.05,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
    });

    const stars = new THREE.Points(geometry, material);
    scene.add(stars);

    // "Their" star — brighter, colored
    const specialGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const specialMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2d55,
      transparent: true,
      opacity: 0.9,
    });
    const specialStar = new THREE.Mesh(specialGeometry, specialMaterial);
    specialStar.position.set(0, 0.5, 0);
    scene.add(specialStar);

    // Glow around special star
    const glowGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6b8a,
      transparent: true,
      opacity: 0.15,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(specialStar.position);
    scene.add(glow);

    // Slow rotation
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      stars.rotation.y += 0.0003;
      stars.rotation.x += 0.0001;

      // Pulse the special star
      const t = Date.now() * 0.001;
      const scale = 1 + Math.sin(t * 2) * 0.3;
      specialStar.scale.set(scale, scale, scale);
      glow.scale.set(scale * 2, scale * 2, scale * 2);
      glow.material.opacity = 0.1 + Math.sin(t * 2) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      specialGeometry.dispose();
      specialMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [phase, promiseConfig.star_field_density]);

  const handleWordSubmit = useCallback((word: string) => {
    setHasSubmitted(true);
    send({ type: 'star_word', player, word: word.split(' ')[0] }); // Only first word
    setPhase('waiting');
  }, [send, player]);

  const handleDone = useCallback(() => {
    setPhase('done');
    setTimeout(onComplete, 2500);
  }, [onComplete]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Three.js container — full background */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Content overlay */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          {/* Intro */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="text-center"
            >
              <GlowText as="h2" className="text-title text-warm">
                The Promise
              </GlowText>
            </motion.div>
          )}

          {/* Just starfield — no text, letting them absorb */}
          {phase === 'starfield' && (
            <motion.div
              key="stars"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
            />
          )}

          {/* Naming */}
          {phase === 'naming' && !hasSubmitted && (
            <motion.div
              key="naming"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center gap-6 max-w-xs w-full"
            >
              <GlowText className="text-prompt text-warm text-center">
                {promiseConfig.prompt}
              </GlowText>

              <TextInput
                placeholder="One word..."
                onSubmit={handleWordSubmit}
                maxLength={30}
              />
            </motion.div>
          )}

          {/* Waiting */}
          {phase === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <p className="text-prompt text-warm animate-breathe">
                Waiting for their word...
              </p>
            </motion.div>
          )}

          {/* Reveal */}
          {phase === 'reveal' && starName && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="flex flex-col items-center gap-8 text-center"
            >
              <motion.p
                className="text-small text-warm uppercase tracking-widest"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 0.5 }}
              >
                Your star is named
              </motion.p>

              <GlowText as="h1" className="text-hero text-warm" delay={0.8}>
                {starName.p1Word} {starName.p2Word}
              </GlowText>

              <motion.p
                className="text-small text-warm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 2 }}
              >
                It will burn for as long as you do.
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3 }}
              >
                <button
                  onClick={handleDone}
                  className="text-small text-warm underline opacity-40 hover:opacity-70 transition-opacity cursor-pointer bg-transparent border-none"
                >
                  continue
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* Done */}
          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 2 }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
