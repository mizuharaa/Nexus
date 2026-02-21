"use client";

import { useEffect, useRef, useState } from "react";

const BG_COLOR = "#080808";
const DOT_COLORS = [
  "rgba(255,255,255,0.35)",
  "rgba(255,255,255,0.25)",
  "rgba(255,255,255,0.2)",
  "rgba(100,200,255,0.2)",
  "rgba(180,140,255,0.18)",
];
const GRID_GAP = 48;
const JITTER = 8;
const DOT_RADIUS = 1.2;
const INFLUENCE_RADIUS = 120;
const REPULSION_STRENGTH = 0.85;
const SPRING_STRENGTH = 0.08;
const DAMPING = 0.82;
const TRAIL_LENGTH = 4;
const TRAIL_DECAY = 0.65;

interface Dot {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

function createDots(width: number, height: number): Dot[] {
  const dots: Dot[] = [];
  const cols = Math.max(1, Math.floor(width / GRID_GAP));
  const rows = Math.max(1, Math.floor(height / GRID_GAP));
  const total = cols * rows;
  const colorCount = DOT_COLORS.length;

  for (let i = 0; i < total; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const jitterX = (Math.random() - 0.5) * 2 * JITTER;
    const jitterY = (Math.random() - 0.5) * 2 * JITTER;
    const homeX = col * GRID_GAP + GRID_GAP / 2 + jitterX;
    const homeY = row * GRID_GAP + GRID_GAP / 2 + jitterY;

    dots.push({
      homeX,
      homeY,
      x: homeX,
      y: homeY,
      vx: 0,
      vy: 0,
      color: DOT_COLORS[i % colorCount],
    });
  }
  return dots;
}

export function InteractiveDotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const dotsRef = useRef<Dot[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const trailRef = useRef<{ x: number; y: number; w: number }[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      sizeRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      dotsRef.current = createDots(w, h);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      const t = trailRef.current;
      t.unshift({ x: e.clientX, y: e.clientY, w: 1 });
      if (t.length > TRAIL_LENGTH) t.pop();
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
      trailRef.current = [];
    };

    setSize();
    window.addEventListener("resize", setSize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const animate = () => {
      const { w, h } = sizeRef.current;

      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, w, h);

      const dots = dotsRef.current;
      const mouse = mouseRef.current;
      const trail = trailRef.current;

      if (reducedMotion) {
        for (const d of dots) {
          ctx.beginPath();
          ctx.arc(d.homeX, d.homeY, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = d.color;
          ctx.fill();
        }
      } else {
        for (let i = 0; i < trail.length; i++) {
          trail[i].w *= TRAIL_DECAY;
        }

        for (const d of dots) {
          let fx = 0;
          let fy = 0;

          for (let i = 0; i < trail.length; i++) {
            const t = trail[i];
            const weight = t.w;
            const dx = d.x - t.x;
            const dy = d.y - t.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

            if (dist < INFLUENCE_RADIUS) {
              const falloff = 1 - dist / INFLUENCE_RADIUS;
              const strength = REPULSION_STRENGTH * falloff * falloff * weight;
              const nx = dx / dist;
              const ny = dy / dist;
              fx += nx * strength;
              fy += ny * strength;
            }
          }

          if (mouse.x > -500) {
            const dx = d.x - mouse.x;
            const dy = d.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
            if (dist < INFLUENCE_RADIUS) {
              const falloff = 1 - dist / INFLUENCE_RADIUS;
              const strength = REPULSION_STRENGTH * falloff * falloff;
              const nx = dx / dist;
              const ny = dy / dist;
              fx += nx * strength;
              fy += ny * strength;
            }
          }

          const springX = (d.homeX - d.x) * SPRING_STRENGTH;
          const springY = (d.homeY - d.y) * SPRING_STRENGTH;
          fx += springX;
          fy += springY;

          d.vx = (d.vx + fx) * DAMPING;
          d.vy = (d.vy + fy) * DAMPING;
          d.x += d.vx;
          d.y += d.vy;

          ctx.beginPath();
          ctx.arc(d.x, d.y, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = d.color;
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", setSize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-[1] block"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        backgroundColor: BG_COLOR,
      }}
      aria-hidden
    />
  );
}
