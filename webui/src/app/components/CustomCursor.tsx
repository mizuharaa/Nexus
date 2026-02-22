import { useEffect, useRef, useState } from "react";

interface TrailDot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const smoothPos = useRef({ x: -100, y: -100 });
  const vel = useRef({ x: 0, y: 0 });
  const trail = useRef<TrailDot[]>([]);
  const [visible, setVisible] = useState(false);
  const hoveringRef = useRef(false);
  const clickingRef = useRef(false);

  useEffect(() => {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    document.documentElement.style.cursor = "none";

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
    };

    const onDown = () => { clickingRef.current = true; };
    const onUp = () => { clickingRef.current = false; };
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const interactive = t.closest("a, button, [role='button'], input, textarea, select, .nexus-nav-link, .nexus-nav-cta, .nexus-dropdown-item, .nexus-kinetic-card, .heroPipeline__node, .stackCard");
      hoveringRef.current = !!interactive;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mouseover", onOver);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let raf: number;
    let fc = 0;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      fc++;
      const prev = { ...smoothPos.current };
      smoothPos.current.x = lerp(smoothPos.current.x, pos.current.x, 0.12);
      smoothPos.current.y = lerp(smoothPos.current.y, pos.current.y, 0.12);

      vel.current.x = smoothPos.current.x - prev.x;
      vel.current.y = smoothPos.current.y - prev.y;
      const speed = Math.hypot(vel.current.x, vel.current.y);

      const hovering = hoveringRef.current;
      const clicking = clickingRef.current;

      // Cursor arrow (follows raw pos for responsiveness)
      if (cursorRef.current) {
        const scale = clicking ? 0.85 : hovering ? 1.15 : 1;
        cursorRef.current.style.transform =
          `translate(${pos.current.x}px, ${pos.current.y}px) scale(${scale})`;
      }

      // Glow ring (follows smoothed pos for momentum feel)
      if (glowRef.current) {
        const stretch = Math.min(speed * 0.6, 10);
        const angle = Math.atan2(vel.current.y, vel.current.x) * (180 / Math.PI);
        const scaleX = 1 + stretch * 0.025;
        const scaleY = 1 - stretch * 0.012;
        const ringSize = hovering ? 56 : 36;
        glowRef.current.style.width = ringSize + "px";
        glowRef.current.style.height = ringSize + "px";
        glowRef.current.style.transform =
          `translate(${smoothPos.current.x}px, ${smoothPos.current.y}px) translate(-50%, -50%) rotate(${angle}deg) scale(${scaleX}, ${scaleY})`;
        glowRef.current.style.borderColor = hovering
          ? "rgba(167,139,250,0.45)"
          : clicking
            ? "rgba(167,139,250,0.5)"
            : "rgba(167,139,250,0.18)";
        glowRef.current.style.background = hovering
          ? "rgba(139,92,246,0.06)"
          : "transparent";
      }

      // Spawn trail particles on movement
      if (speed > 2.5 && fc % 2 === 0) {
        const spread = Math.min(speed * 1.5, 24);
        trail.current.push({
          x: smoothPos.current.x + (Math.random() - 0.5) * spread,
          y: smoothPos.current.y + (Math.random() - 0.5) * spread,
          vx: (Math.random() - 0.5) * 0.8 - vel.current.x * 0.15,
          vy: (Math.random() - 0.5) * 0.8 - vel.current.y * 0.15,
          life: 1,
          maxLife: 0.6 + Math.random() * 0.6,
          size: 1.5 + Math.random() * 3,
          hue: 255 + Math.random() * 50,
        });
      }

      if (speed > 6 && fc % 3 === 0) {
        trail.current.push({
          x: smoothPos.current.x + (Math.random() - 0.5) * 30,
          y: smoothPos.current.y + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          life: 1,
          maxLife: 0.4 + Math.random() * 0.4,
          size: 0.8 + Math.random() * 1.5,
          hue: 200 + Math.random() * 90,
        });
      }

      // Draw particles
      if (ctx && canvas) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        for (let i = trail.current.length - 1; i >= 0; i--) {
          const dot = trail.current[i];
          dot.life -= 0.018 / dot.maxLife;
          dot.x += dot.vx;
          dot.y += dot.vy;
          dot.vx *= 0.97;
          dot.vy *= 0.97;

          if (dot.life <= 0) {
            trail.current.splice(i, 1);
            continue;
          }

          const alpha = dot.life * 0.55;
          const s = dot.size * dot.life;

          // Pixel rectangles for arcade feel
          ctx.fillStyle = `hsla(${dot.hue}, 65%, 72%, ${alpha})`;
          const px = Math.round(dot.x - s / 2);
          const py = Math.round(dot.y - s / 2);
          const ps = Math.max(1, Math.ceil(s));
          ctx.fillRect(px, py, ps, ps);

          // Occasional cross sparkle
          if (dot.size > 2.5 && dot.life > 0.5) {
            ctx.fillStyle = `hsla(${dot.hue}, 50%, 85%, ${alpha * 0.4})`;
            ctx.fillRect(px - 1, py, 1, ps);
            ctx.fillRect(px + ps, py, 1, ps);
            ctx.fillRect(px, py - 1, ps, 1);
            ctx.fillRect(px, py + ps, ps, 1);
          }
        }
      }

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [visible]);

  if (typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)) {
    return null;
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="nexus-cursor-canvas"
        style={{ opacity: visible ? 1 : 0 }}
      />
      <div
        ref={glowRef}
        className="nexus-cursor-ring"
        style={{ opacity: visible ? 1 : 0 }}
      />
      <div
        ref={cursorRef}
        className="nexus-cursor-arrow"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
          <path
            d="M2 1L2 27L7.5 21L13 31L16.5 29L11 19.5L19 19.5L2 1Z"
            fill="rgba(139,92,246,0.9)"
            stroke="rgba(20,20,30,0.9)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M4 5L4 22L7.5 18.5L12 27L14 26L9.5 17.5L16 17.5L4 5Z"
            fill="rgba(196,181,253,0.35)"
          />
        </svg>
      </div>
    </>
  );
}
