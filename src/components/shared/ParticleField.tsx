import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
}

interface ParticleFieldProps {
  count?: number;
  color?: string;
  speed?: number;
  drift?: 'up' | 'down' | 'random';
  className?: string;
}

export function ParticleField({
  count = 60,
  color = 'var(--color-accent)',
  speed = 0.3,
  drift = 'up',
  className = '',
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Resolve CSS variable to actual color
    const resolvedColor = getComputedStyle(document.documentElement)
      .getPropertyValue(color.replace('var(', '').replace(')', ''))
      .trim() || color;

    // Parse hex to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : { r: 255, g: 45, b: 85 };
    };

    const rgb = hexToRgb(resolvedColor);
    const rect = canvas.getBoundingClientRect();

    // Initialize particles
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      vx: (Math.random() - 0.5) * speed,
      vy: drift === 'up' ? -Math.random() * speed : drift === 'down' ? Math.random() * speed : (Math.random() - 0.5) * speed,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.6,
      life: Math.random() * 200,
      maxLife: 150 + Math.random() * 200,
    }));

    const animate = () => {
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // Fade in and out over lifetime
        const lifeRatio = p.life / p.maxLife;
        const fade = lifeRatio < 0.1 ? lifeRatio / 0.1 : lifeRatio > 0.9 ? (1 - lifeRatio) / 0.1 : 1;
        const alpha = p.opacity * fade;

        // Respawn
        if (p.life >= p.maxLife || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) {
          p.x = Math.random() * w;
          p.y = drift === 'up' ? h + 10 : drift === 'down' ? -10 : Math.random() * h;
          p.life = 0;
          p.opacity = Math.random() * 0.6;
          p.maxLife = 150 + Math.random() * 200;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [count, color, speed, drift]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}
