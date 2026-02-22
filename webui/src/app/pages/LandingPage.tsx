import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { ArrowRight, Github, Eye, Telescope, ChevronDown, Zap, Shield, GitBranch, BarChart3, Cpu } from "lucide-react";
import HeroPipelineAnimation from "../components/HeroPipelineAnimation";
import GlobeVisualization from "../components/GlobeVisualization";
import CompanyCarousel from "../components/CompanyCarousel";
import ThemeToggle from "../components/ThemeToggle";
import CustomCursor from "../components/CustomCursor";
import { useTheme } from "../components/ThemeProvider";
import StackingCards from "../components/StackingCards";

function ScrollReveal({
  children,
  direction = "up",
  scale = false,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right";
  scale?: boolean;
  className?: string;
  delay?: number;
}) {
  const dirMap = {
    up: { y: 60 },
    down: { y: -60 },
    left: { x: 80 },
    right: { x: -80 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...dirMap[direction], ...(scale ? { scale: 0.92 } : {}) }}
      whileInView={{ opacity: 1, x: 0, y: 0, ...(scale ? { scale: 1 } : {}) }}
      viewport={{ once: false, amount: 0.15 }}
      transition={{ duration: 0.9, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const marqueeStats = [
  { value: "100K+", label: "Lines Analyzed" },
  { value: "25", label: "File Limit" },
  { value: "3", label: "Futures Simulated" },
  { value: "0", label: "Manual Prompts" },
  { value: "95%", label: "Test Coverage" },
  { value: "<5m", label: "To Ship" },
];


const capabilities = [
  {
    num: "01",
    icon: Eye,
    title: "TOPOLOGY",
    desc: "Your codebase as a living feature graph. Click any node to see dependencies, risk scores, and expansion paths.",
    accent: "#8b5cf6",
  },
  {
    num: "02",
    icon: Telescope,
    title: "FORESIGHT",
    desc: "Three strategic paths generated from your code. Expansion. Stability. Pivot. See the tradeoffs before you commit.",
    accent: "#6366f1",
  },
  {
    num: "03",
    icon: Cpu,
    title: "EXECUTION",
    desc: "Pick a feature. Claude builds it in a sandbox. Tests run. Lint passes. A deploy-ready PR opens automatically.",
    accent: "#a78bfa",
  },
];

const testimonials = [
  { name: "User A", role: "Role @ Company", text: "Testimonial placeholder — real feedback coming soon." },
  { name: "User B", role: "Role @ Company", text: "Testimonial placeholder — real feedback coming soon." },
  { name: "User C", role: "Role @ Company", text: "Testimonial placeholder — real feedback coming soon." },
  { name: "User D", role: "Role @ Company", text: "Testimonial placeholder — real feedback coming soon." },
  { name: "User E", role: "Role @ Company", text: "Testimonial placeholder — real feedback coming soon." },
  { name: "User F", role: "Role @ Company", text: "Testimonial placeholder — real feedback coming soon." },
];

/* ═══════════════════════════════════════════
   Navbar
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   Scroll Text Reveal — words fade in as you scroll
   ═══════════════════════════════════════════ */
function TextReveal({ text, className = "", style = {} }: { text: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.4"] });
  const words = text.split(" ");
  return (
    <div ref={ref} className={className} style={style}>
      {words.map((word, i) => (
        <TextRevealWord key={i} progress={scrollYProgress} index={i} total={words.length}>
          {word}
        </TextRevealWord>
      ))}
    </div>
  );
}

function TextRevealWord({ children, progress, index, total }: { children: string; progress: ReturnType<typeof useScroll>["scrollYProgress"]; index: number; total: number }) {
  const start = index / total;
  const end = start + 1 / total;
  const opacity = useTransform(progress, [start, end], [0.15, 1]);
  const filterVal = useTransform(progress, [start, end], ["blur(4px)", "blur(0px)"]);
  return (
    <motion.span
      className="nexus-text-reveal-word"
      style={{ opacity, filter: filterVal, marginRight: "0.3em" }}
    >
      {children}
    </motion.span>
  );
}

/* ═══════════════════════════════════════════
   Testimonial Ticker
   ═══════════════════════════════════════════ */
function TestimonialTicker({ isDark }: { isDark: boolean }) {
  return (
    <div className="relative overflow-hidden py-16" style={{ zIndex: 10 }}>
      <div className="nexus-ticker">
        {[...testimonials, ...testimonials].map((t, i) => (
          <div key={i} className="nexus-ticker-card">
            <p style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)", fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
              "{t.text}"
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6, #c084fc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                {t.name[0]}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.8)" }}>{t.name}</div>
                <div style={{ fontSize: 10, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }}>{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Particle Field Background
   ═══════════════════════════════════════════ */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1, y: -1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    const count = 60;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
      });
    }

    const onMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMove);

    let raf: number;
    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        if (mx >= 0) {
          const dist = Math.hypot(p.x - mx, p.y - my);
          if (dist < 120) {
            const force = (120 - dist) / 120 * 0.015;
            p.vx += (p.x - mx) * force;
            p.vy += (p.y - my) * force;
          }
        }

        p.vx *= 0.99;
        p.vy *= 0.99;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(139, 92, 246, 0.25)";
        ctx.fill();
      });

      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const d = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${(1 - d / 100) * 0.08})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }} />;
}

/* ═══════════════════════════════════════════
   Magnetic Button wrapper
   ═══════════════════════════════════════════ */
function MagneticWrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 80) {
      setOffset({ x: dx * 0.25, y: dy * 0.25 });
    }
  };

  const handleLeave = () => setOffset({ x: 0, y: 0 });

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: "spring", stiffness: 350, damping: 15, mass: 0.5 }}
      style={{ display: "inline-flex" }}
    >
      {children}
    </motion.div>
  );
}

const FEATURE_ITEMS = [
  { icon: Zap, label: "Auto-Fix Engine", desc: "Autonomous code repair pipeline", href: "#features" },
  { icon: Shield, label: "Security Scanner", desc: "Detect & rotate leaked secrets", href: "#features" },
  { icon: GitBranch, label: "Future Simulator", desc: "Explore 3 strategic code paths", href: "#features" },
  { icon: BarChart3, label: "Analytics", desc: "Coverage, risk & performance insights", href: "#features" },
];

function NavBar({ isDark }: { isDark: boolean }) {
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const openDropdown = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setFeaturesOpen(true);
  };
  const closeDropdown = () => {
    closeTimer.current = setTimeout(() => setFeaturesOpen(false), 150);
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        height: "72px",
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        backdropFilter: "blur(24px) saturate(1.4)",
        WebkitBackdropFilter: "blur(24px) saturate(1.4)",
        background: isDark ? "rgba(8,8,14,0.82)" : "rgba(252,252,254,0.88)",
        transition: "background 0.4s ease",
      }}
    >
      <div className="max-w-[1360px] mx-auto px-6 md:px-10 h-full flex items-center justify-between">
        {/* Left — Logo */}
        <Link to="/" className="nexus-logo-premium">
          NEXUS
        </Link>

        {/* Center — Nav links */}
        <div className="hidden md:flex items-center gap-1" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
          {/* Features dropdown */}
          <div
            className="relative"
            onMouseEnter={openDropdown}
            onMouseLeave={closeDropdown}
          >
            <button
              className="nexus-nav-link"
              style={{ color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)" }}
              onClick={() => setFeaturesOpen((v) => !v)}
            >
              Features
              <ChevronDown
                className="w-3.5 h-3.5 transition-transform"
                style={{ transform: featuresOpen ? "rotate(180deg)" : "rotate(0)" }}
              />
            </button>

            <AnimatePresence>
              {featuresOpen && (
                <motion.div
                  className="nexus-dropdown"
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    background: isDark ? "rgba(14,14,22,0.96)" : "rgba(255,255,255,0.97)",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                  }}
                >
                  {FEATURE_ITEMS.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="nexus-dropdown-item"
                      style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)" }}
                      onClick={() => setFeaturesOpen(false)}
                    >
                      <span
                        className="nexus-dropdown-icon"
                        style={{ color: isDark ? "#a78bfa" : "#7c3aed" }}
                      >
                        <item.icon className="w-4 h-4" />
                      </span>
                      <span>
                        <span className="nexus-dropdown-label">{item.label}</span>
                        <span
                          className="nexus-dropdown-desc"
                          style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)" }}
                        >
                          {item.desc}
                        </span>
                      </span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {["Pricing", "Docs"].map((item) => (
            <Link
              key={item}
              to={`#${item.toLowerCase()}`}
              className="nexus-nav-link"
              style={{ color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)" }}
            >
              {item}
            </Link>
          ))}
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <MagneticWrap>
            <Link to="/onboarding" className="nexus-nav-cta">
              Get Started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </MagneticWrap>
        </div>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════
   Dashboard Window Mockup
   Shows a realistic preview of the Nexus dashboard
   inside a window chrome frame with scanlines + LEDs
   ═══════════════════════════════════════════ */
function DashboardMockup({ isDark }: { isDark: boolean }) {
  const border = isDark ? "rgba(123,92,255,0.2)" : "rgba(123,92,255,0.12)";
  const subtle = isDark ? "rgba(255,255,255," : "rgba(0,0,0,";

  return (
    <div
      className="w-full rounded-lg overflow-hidden"
      style={{
        border: `1px solid ${border}`,
        background: isDark ? "rgba(11,11,18,0.95)" : "rgba(255,255,255,0.95)",
        boxShadow: isDark
          ? "0 30px 60px rgba(0,0,0,0.6), 0 0 50px rgba(123,92,255,0.08)"
          : "0 30px 60px rgba(0,0,0,0.12)",
      }}
    >
      {/* ── Window Title Bar ── */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          borderBottom: `1px solid ${subtle}0.06)`,
          background: isDark ? "rgba(20,20,28,0.8)" : "rgba(240,240,245,0.9)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full bg-[#00D084] animate-pulse"
            style={{ boxShadow: "0 0 6px rgba(0,208,132,0.6)" }}
          />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.1em]"
            style={{ color: `${subtle}0.4)` }}
          >
            Nexus — Dashboard
          </span>
        </div>
        <div className="w-14" />
      </div>

      {/* ── Screen Content ── */}
      <div className="p-3 md:p-5 relative">
        {/* Scanlines */}
        {isDark && (
          <div
            className="absolute inset-0 pointer-events-none rounded-b-lg"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0) 50%, rgba(0,0,0,0.02) 50%)",
              backgroundSize: "100% 4px",
              zIndex: 20,
            }}
            aria-hidden="true"
          />
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 md:mb-4">
          {[
            { label: "FEATURES", value: "42", color: isDark ? "#FAFAFA" : "#1A1A2E" },
            { label: "RISK SCORE", value: "58", color: "#FFB020" },
            { label: "DRIFT", value: "+3", color: "#7B5CFF" },
            { label: "ACTIVE RUNS", value: "2", color: isDark ? "#FAFAFA" : "#1A1A2E" },
          ].map((m) => (
            <div
              key={m.label}
              className="p-2.5 rounded"
              style={{
                background: `${subtle}0.03)`,
                border: `1px solid ${subtle}0.06)`,
              }}
            >
              <div
                className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.1em] mb-1"
                style={{ color: `${subtle}0.3)` }}
              >
                {m.label}
              </div>
              <div className="text-lg md:text-2xl font-black leading-none" style={{ color: m.color }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Graph + Activity Split */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-3 mb-3 md:mb-4">
          {/* Feature Graph Preview */}
          <div
            className="md:col-span-3 p-3 rounded relative"
            style={{
              background: `${subtle}0.02)`,
              border: `1px solid ${subtle}0.06)`,
            }}
          >
            <div
              className="text-[9px] font-bold uppercase tracking-[0.08em] mb-2"
              style={{ color: `${subtle}0.3)` }}
            >
              Feature Graph
            </div>
            <svg className="w-full h-20 md:h-28" viewBox="0 0 320 100">
              <line x1="60" y1="30" x2="150" y2="20" stroke="rgba(123,92,255,0.3)" strokeWidth="1.5" />
              <line x1="60" y1="30" x2="120" y2="72" stroke="rgba(123,92,255,0.3)" strokeWidth="1.5" />
              <line x1="150" y1="20" x2="230" y2="50" stroke="rgba(123,92,255,0.3)" strokeWidth="1.5" />
              <line x1="150" y1="20" x2="155" y2="78" stroke="rgba(255,71,87,0.35)" strokeWidth="1.5" strokeDasharray="4 3" />
              <line x1="230" y1="50" x2="285" y2="28" stroke="rgba(0,208,132,0.35)" strokeWidth="1.5" />
              <line x1="120" y1="72" x2="155" y2="78" stroke="rgba(123,92,255,0.2)" strokeWidth="1" />
              <circle cx="60" cy="30" r="6" fill="#7B5CFF" />
              <circle cx="150" cy="20" r="6" fill="#7B5CFF" />
              <circle cx="120" cy="72" r="5" fill="#38D9FF" />
              <circle cx="230" cy="50" r="6" fill="#00D084" />
              <circle cx="155" cy="78" r="5" fill="#FF4757" />
              <circle cx="285" cy="28" r="5" fill="#7B5CFF" opacity="0.7" />
              <text x="60" y="48" textAnchor="middle" fill={`${subtle}0.35)`} fontSize="7" fontWeight="700">CORE</text>
              <text x="150" y="9" textAnchor="middle" fill={`${subtle}0.35)`} fontSize="7" fontWeight="700">AUTH</text>
              <text x="120" y="90" textAnchor="middle" fill={`${subtle}0.35)`} fontSize="7" fontWeight="700">DB</text>
              <text x="230" y="68" textAnchor="middle" fill={`${subtle}0.35)`} fontSize="7" fontWeight="700">API</text>
              <text x="155" y="95" textAnchor="middle" fill="rgba(255,71,87,0.55)" fontSize="7" fontWeight="700">.ENV</text>
              <text x="285" y="46" textAnchor="middle" fill={`${subtle}0.35)`} fontSize="7" fontWeight="700">TESTS</text>
            </svg>
          </div>

          {/* Activity Feed */}
          <div
            className="md:col-span-2 p-3 rounded"
            style={{
              background: `${subtle}0.02)`,
              border: `1px solid ${subtle}0.06)`,
            }}
          >
            <div
              className="text-[9px] font-bold uppercase tracking-[0.08em] mb-2"
              style={{ color: `${subtle}0.3)` }}
            >
              Recent Activity
            </div>
            <div className="space-y-2.5">
              {[
                { action: "PR Opened", detail: "Payment Retry", time: "2h", color: "#00D084" },
                { action: "Feature Built", detail: "Cache Layer", time: "5h", color: "#00D084" },
                { action: "Risk Increase", detail: "Auth Module +3", time: "1d", color: "#FFB020" },
                { action: "Coverage +12%", detail: "Test Suite", time: "2d", color: "#7B5CFF" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
                    style={{
                      background: item.color,
                      boxShadow: `0 0 6px ${item.color}88`,
                    }}
                  />
                  <div className="min-w-0">
                    <div
                      className="text-[10px] md:text-xs font-semibold truncate"
                      style={{ color: `${subtle}0.7)` }}
                    >
                      {item.action}
                    </div>
                    <div
                      className="text-[9px] md:text-[10px]"
                      style={{ color: `${subtle}0.35)` }}
                    >
                      {item.detail} · {item.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Execution Log */}
        <div
          className="p-3 rounded font-mono text-[11px] md:text-xs"
          style={{
            background: isDark ? "#08080d" : "#1a1a2e",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)"}`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-white/25">
              Execution Log — Run #2041
            </span>
            <div className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full bg-[#00D084] animate-pulse"
                style={{ boxShadow: "0 0 6px rgba(0,208,132,0.6)" }}
              />
              <span className="text-[8px] text-[#00D084]/60 uppercase tracking-wider font-bold">
                Live
              </span>
            </div>
          </div>
          <div className="space-y-0.5 text-white/55">
            <div className="flex items-center gap-2">
              <span className="text-[#00D084]">✓</span>
              <span>Sandbox created successfully</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#00D084]">✓</span>
              <span>Generated test suite (8 tests)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#00D084]">✓</span>
              <span>All tests passed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#7B5CFF]">→</span>
              <span>Implementing feature logic...</span>
              <span className="inline-block w-1.5 h-3.5 bg-[#7B5CFF] animate-pulse rounded-sm" />
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div
          className="flex items-center justify-between mt-2.5 pt-2.5"
          style={{ borderTop: `1px solid ${subtle}0.05)` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full bg-[#00D084] animate-pulse"
              style={{ boxShadow: "0 0 8px rgba(0,208,132,0.6)" }}
            />
            <span
              className="text-[9px] font-bold uppercase tracking-[0.1em]"
              style={{ color: `${subtle}0.35)` }}
            >
              System Online
            </span>
          </div>
          <span
            className="text-[9px] font-mono"
            style={{ color: `${subtle}0.2)` }}
          >
            2 active executions · 15 files changed
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Hero parallax
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 300], [1, 0.95]);

  // Scroll-linked background hue shift
  const bgDark = useTransform(
    scrollY,
    [0, 1800, 3600, 5400, 7200, 9000],
    ["#0B0B12", "#100820", "#08101a", "#081210", "#14081c", "#0B0B12"]
  );
  const bgLight = useTransform(
    scrollY,
    [0, 1800, 3600, 5400, 7200, 9000],
    ["#F5F5F7", "#F0EEF8", "#EDF3F7", "#EFF6F0", "#F6EEF4", "#F5F5F7"]
  );

  // Dashboard scroll-linked zoom + tilt
  const guardrailsRef = useRef<HTMLElement>(null);
  const { scrollYProgress: grScroll } = useScroll({
    target: guardrailsRef,
    offset: ["start end", "center center"],
  });
  const dashScale = useTransform(grScroll, [0, 1], [0.85, 1]);
  const dashY = useTransform(grScroll, [0, 1], [60, 0]);
  const dashRotateX = useTransform(grScroll, [0, 1], [8, 0]);

  // CTA scroll-linked zoom
  const ctaRef = useRef<HTMLElement>(null);
  const { scrollYProgress: ctaScroll } = useScroll({
    target: ctaRef,
    offset: ["start end", "center center"],
  });
  const ctaScale = useTransform(ctaScroll, [0, 1], [0.88, 1]);
  const ctaY = useTransform(ctaScroll, [0, 1], [40, 0]);

  return (
    <motion.div
      className="min-h-screen relative"
      style={{
        overflowX: "clip",
        backgroundColor: isDark ? bgDark : bgLight,
      }}
    >
      {/* Noise Texture Overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 9999,
          opacity: 0.035,
          mixBlendMode: "overlay",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Custom cursor */}
      <CustomCursor />

      {/* Particle field behind hero */}
      <ParticleField />

      {/* ═══════════ NAVBAR ═══════════ */}
      <NavBar isDark={isDark} />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative pt-[100px] pb-[40px]" style={{ zIndex: 10 }}>
        <motion.div
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
          className="nexus-hero-grid"
        >
          {/* Left — Headline + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="min-w-0"
            style={{ zIndex: 2 }}
          >
            <div className="nexus-headline-block">
              <h1
                className="nexus-hero-headline uppercase tracking-tighter mb-4"
                style={{ color: isDark ? "white" : "#1A1A2E" }}
              >
                Your Codebase.
                <br />
                <span className="nexus-gradient-highlight">Visualized. Evolved.</span>
              </h1>

              <p
                className="text-sm md:text-base font-bold uppercase tracking-[0.15em] mb-8"
                style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)" }}
              >
                Map features. Simulate futures. Ship with confidence.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link to="/onboarding" className="nexus-btn nexus-btn-primary nexus-cta-glow">
                  <Github className="w-4 h-4" />
                  Connect Repository
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  className="nexus-btn nexus-btn-secondary"
                  style={{
                    color: isDark ? "white" : "#1A1A2E",
                    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)",
                  }}
                >
                  View Docs
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right — Interactive Graph */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.4 }}
            className="min-w-0 overflow-hidden"
            style={{ zIndex: 1 }}
          >
            <HeroPipelineAnimation />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════ STATS MARQUEE ═══════════ */}
      <section className="relative" style={{ zIndex: 10 }}>
        <div
          className="overflow-hidden py-6 md:py-8"
          style={{
            borderTop: `2px solid ${isDark ? "rgba(123,92,255,0.15)" : "rgba(123,92,255,0.1)"}`,
            borderBottom: `2px solid ${isDark ? "rgba(123,92,255,0.15)" : "rgba(123,92,255,0.1)"}`,
          }}
        >
          <div
            className="nexus-marquee-track flex whitespace-nowrap"
            style={{ animation: "statsMarquee 30s linear infinite" }}
          >
            {[0, 1].map((setIdx) => (
              <div key={setIdx} className="flex items-center shrink-0">
                {marqueeStats.map((stat, i) => (
                  <div key={`${setIdx}-${i}`} className="flex items-baseline gap-3 mx-8 md:mx-12">
                    <span className="text-[2.5rem] md:text-[4rem] font-black tracking-tighter leading-none nexus-gradient-highlight select-none">
                      {stat.value}
                    </span>
                    <span
                      className="text-[10px] md:text-xs font-bold uppercase tracking-[0.15em]"
                      style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)" }}
                    >
                      {stat.label}
                    </span>
                  </div>
                ))}
                <span
                  className="mx-8 md:mx-12 text-lg select-none nexus-gradient-highlight"
                  aria-hidden="true"
                >
                  ◆
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS — STACKING CARDS ═══════════ */}
      <StackingCards />

      {/* ═══════════ CAPABILITIES ═══════════ */}
      <section className="relative py-24 md:py-32" style={{ zIndex: 10 }} id="features">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          <TextReveal
            text="Built for Solo Builders. Every tool you need, zero config required."
            className="text-[clamp(1.8rem,4vw,3.2rem)] font-black leading-[1.1] tracking-tight text-center mb-6"
            style={{ color: isDark ? "white" : "#1A1A2E" }}
          />
          <p
            className="text-center text-sm md:text-base max-w-2xl mx-auto mb-16 md:mb-20 leading-relaxed"
            style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)" }}
          >
            Three core systems working together. Understand your code. Plan your
            future. Execute without prompting.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {capabilities.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <ScrollReveal key={i} direction="up" delay={i * 0.12}>
                  <div
                    className="nexus-kinetic-card relative overflow-hidden rounded-2xl p-8 md:p-10 min-h-[280px] group transition-all duration-300 hover:translate-y-[-6px]"
                    style={{
                      background: isDark
                        ? "linear-gradient(160deg, rgba(12,12,20,0.92) 0%, rgba(18,14,30,0.92) 100%)"
                        : "linear-gradient(160deg, rgba(255,255,255,0.9) 0%, rgba(245,242,255,0.9) 100%)",
                      border: `1px solid ${isDark ? "rgba(139,92,246,0.1)" : "rgba(0,0,0,0.08)"}`,
                      backdropFilter: "blur(16px)",
                      boxShadow: isDark
                        ? "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.35)"
                        : "0 4px 24px rgba(0,0,0,0.06)",
                    }}
                  >
                    {/* Top edge gradient line */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[1px] opacity-30 group-hover:opacity-70 transition-opacity duration-300"
                      style={{ background: `linear-gradient(90deg, transparent 5%, ${cap.accent} 50%, transparent 95%)` }}
                    />

                    {/* Large watermark number */}
                    <span
                      aria-hidden="true"
                      className="absolute top-1 right-3 font-black pointer-events-none select-none transition-colors duration-300"
                      style={{
                        fontSize: "clamp(5rem, 10vw, 8rem)",
                        lineHeight: 1,
                        color: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
                      }}
                    >
                      {cap.num}
                    </span>

                    {/* Corner glow */}
                    <div
                      className="absolute -bottom-16 -right-8 w-48 h-48 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ background: `radial-gradient(circle, ${cap.accent}12, transparent 70%)` }}
                    />

                    <Icon
                      className="w-7 h-7 mb-6 relative z-10 transition-colors duration-300"
                      style={{ color: isDark ? "#a78bfa" : "#7c3aed" }}
                      strokeWidth={1.5}
                    />
                    <h3
                      className="text-xl md:text-2xl font-extrabold mb-3 tracking-tight relative z-10 transition-colors duration-300"
                      style={{ color: isDark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.88)" }}
                    >
                      {cap.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed relative z-10 transition-colors duration-300"
                      style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}
                    >
                      {cap.desc}
                    </p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <TestimonialTicker isDark={isDark} />

      {/* ═══════════ GUARDRAILS + DASHBOARD ═══════════ */}
      <section
        ref={guardrailsRef}
        className="relative py-24 md:py-32 overflow-hidden"
        style={{ zIndex: 10 }}
      >
        {/* Blueprint grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: isDark ? 0.025 : 0.02,
            backgroundImage: `linear-gradient(${isDark ? "rgba(123,92,255,0.6)" : "rgba(123,92,255,0.4)"} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? "rgba(123,92,255,0.6)" : "rgba(123,92,255,0.4)"} 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
          aria-hidden="true"
        />

        {/* Radial glow behind the dashboard */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? "radial-gradient(ellipse 70% 50% at 50% 60%, rgba(123,92,255,0.06) 0%, transparent 70%)"
              : "radial-gradient(ellipse 70% 50% at 50% 60%, rgba(123,92,255,0.04) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        {/* Heading */}
        <div className="max-w-[1000px] mx-auto px-6 md:px-12 text-center relative">
          <TextReveal
            text="Sandboxed. Constrained. Never Out of Control."
            className="text-[clamp(2.5rem,6vw,5rem)] font-black leading-[0.9] tracking-tighter uppercase mb-6"
            style={{ color: isDark ? "white" : "#1A1A2E" }}
          />
          <ScrollReveal direction="up">
            <p
              className="text-base md:text-lg max-w-3xl mx-auto mb-4 leading-relaxed"
              style={{ color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)" }}
            >
              Every execution is sandboxed, schema-validated, and scope-bounded.
              Claude can't touch .env files, deployment configs, or CI pipelines.
              Max 25 files changed. Max 2 fix iterations.
            </p>
          </ScrollReveal>
        </div>

        {/* Dashboard Mockup — scroll-linked zoom + perspective tilt */}
        <div className="max-w-5xl mx-auto px-4 md:px-12 mt-10 mb-10">
          <motion.div
            style={{
              scale: dashScale,
              y: dashY,
              rotateX: dashRotateX,
              transformPerspective: 1200,
            }}
          >
            <DashboardMockup isDark={isDark} />
          </motion.div>
        </div>

        {/* Add GitHub Repo Button */}
        <div className="text-center mb-12">
          <Link
            to="/onboarding"
            className="nexus-btn nexus-btn-primary nexus-cta-glow inline-flex"
          >
            <Github className="w-5 h-5" />
            Add GitHub Repository
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Constraint Labels */}
        <div className="max-w-[1000px] mx-auto px-6 md:px-12 text-center relative">
          <div
            className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-xs md:text-sm uppercase tracking-[0.15em] font-bold"
            style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)" }}
          >
            {["File Limits", "Schema Validation", "Sandbox Isolation", "Scope Locking"].map(
              (label, i) => (
                <span key={i} className="flex items-center gap-3">
                  {i > 0 && (
                    <span
                      style={{
                        color: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
                      }}
                    >
                      ◆
                    </span>
                  )}
                  {label}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ GLOBE & STATS ═══════════ */}
      <section className="relative py-24 md:py-32" style={{ zIndex: 10 }}>
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <TextReveal
              text="Global Scale. Engineering teams across the globe use Nexus to ship faster."
              className="text-[clamp(1.6rem,3.5vw,2.8rem)] font-black leading-[1.15] tracking-tight max-w-3xl mx-auto"
              style={{ color: isDark ? "white" : "#1A1A2E" }}
            />
          </div>

          <ScrollReveal direction="up" scale delay={0.15}>
            <div className="nexus-globe-section">
              <div>
                <GlobeVisualization />
              </div>
              <div className="nexus-globe-stats-block">
                <h3
                  className="nexus-globe-title"
                  style={{ color: isDark ? "white" : "#1A1A2E" }}
                >
                  Global Usage
                </h3>
                {[
                  { value: "42+", label: "Countries" },
                  { value: "2.3M", label: "Files Analyzed" },
                  { value: "12%", label: "Avg Performance Gain" },
                ].map((stat) => (
                  <div key={stat.label} className="nexus-globe-stat-item">
                    <div className="nexus-globe-stat-value">{stat.value}</div>
                    <div
                      className="nexus-globe-stat-label"
                      style={{
                        color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════ COMPANY CAROUSEL ═══════════ */}
      <ScrollReveal direction="up">
        <CompanyCarousel />
      </ScrollReveal>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section ref={ctaRef} className="relative py-32 md:py-40" style={{ zIndex: 10 }}>
        <motion.div style={{ scale: ctaScale, y: ctaY }}>
          <div className="max-w-[95vw] mx-auto px-6 md:px-12 text-center">
            <div className="mb-8">
              <TextReveal
                text="Stop Building Alone. Start Evolving."
                className="text-[clamp(2.5rem,8vw,7rem)] font-black leading-[0.85] tracking-tighter uppercase"
                style={{ color: isDark ? "white" : "#1A1A2E" }}
              />
            </div>
            <ScrollReveal direction="up" scale>
              <p
                className="text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed"
                style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)" }}
              >
                Connect your repo. See the graph. Ship features you didn't have
                time to build.
              </p>
              <Link
                to="/onboarding"
                className="nexus-btn nexus-btn-primary nexus-cta-glow inline-flex"
              >
                <Github className="w-4 h-4" />
                Connect Your Repository
                <ArrowRight className="w-4 h-4" />
              </Link>
            </ScrollReveal>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer
        className="relative py-16 md:py-20 px-6 md:px-12"
        style={{
          zIndex: 10,
          borderTop: `2px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        }}
      >
        <div className="max-w-[95vw] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
            <div>
              <div className="nexus-logo-premium text-[16px] mb-4">NEXUS</div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" }}
              >
                AI-native developer tool for autonomous feature evolution.
              </p>
            </div>
            {[
              { title: "Product", links: ["Features", "Pricing", "Changelog"] },
              { title: "Resources", links: ["Documentation", "API Reference", "GitHub"] },
              { title: "Company", links: ["About", "Privacy", "Terms"] },
            ].map((col) => (
              <div key={col.title}>
                <h4
                  className="text-xs font-bold uppercase tracking-[0.15em] mb-4"
                  style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)" }}
                >
                  {col.title}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm transition-colors hover:text-[#7B5CFF]"
                        style={{
                          color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                        }}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs"
            style={{
              borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
            }}
          >
            <span>&copy; 2026 Nexus. All rights reserved.</span>
            <span className="uppercase tracking-[0.1em] font-bold">
              Scan. Plan. Ship.
            </span>
          </div>
        </div>
      </footer>

      {/* Marquee Keyframes */}
      <style>{`
        @keyframes statsMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </motion.div>
  );
}
