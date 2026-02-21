import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface GNode {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
  tip: string;
  vuln?: boolean;
}

type Phase = "init" | "spawn" | "connect" | "scan" | "vuln" | "fix" | "idle";

const NODES: GNode[] = [
  { id: "core", label: "Core", x: 400, y: 235, r: 22, tip: "Central module — 12 dependencies mapped" },
  { id: "auth", label: "Auth", x: 165, y: 145, r: 17, tip: "JWT validation — HMAC vulnerability patched", vuln: true },
  { id: "api", label: "API", x: 615, y: 120, r: 17, tip: "REST endpoints — rate limiting configured" },
  { id: "users", label: "Users", x: 80, y: 310, r: 15, tip: "User service — input sanitization applied" },
  { id: "pay", label: "Payments", x: 705, y: 275, r: 17, tip: "Payment flow — PCI compliance verified", vuln: true },
  { id: "db", label: "Database", x: 240, y: 375, r: 16, tip: "PostgreSQL — connection pooling optimized" },
  { id: "cache", label: "Cache", x: 560, y: 365, r: 15, tip: "Redis — TTL & eviction configured" },
  { id: "cfg", label: "Config", x: 305, y: 78, r: 13, tip: "Environment — secrets encrypted at rest" },
  { id: "queue", label: "Queue", x: 400, y: 420, r: 14, tip: "Message broker — retry logic hardened" },
  { id: "logs", label: "Logs", x: 730, y: 400, r: 13, tip: "Logging — PII redaction enabled" },
];

const EDGES: [string, string][] = [
  ["cfg", "core"],
  ["auth", "core"],
  ["core", "api"],
  ["users", "auth"],
  ["core", "pay"],
  ["db", "core"],
  ["core", "cache"],
  ["queue", "db"],
  ["queue", "cache"],
  ["api", "logs"],
  ["pay", "logs"],
  ["users", "db"],
];

const NODE_MAP = new Map(NODES.map((n) => [n.id, n]));

function edgePath(a: string, b: string): string {
  const f = NODE_MAP.get(a)!;
  const t = NODE_MAP.get(b)!;
  const dx = t.x - f.x;
  const dy = t.y - f.y;
  return `M${f.x},${f.y} Q${(f.x + t.x) / 2 + dy * 0.08},${(f.y + t.y) / 2 - dx * 0.08} ${t.x},${t.y}`;
}

const STATUS: Record<Phase, [string, string, boolean]> = {
  init: ["#7B5CFF", "INITIALIZING...", true],
  spawn: ["#7B5CFF", "MAPPING TOPOLOGY...", true],
  connect: ["#7B5CFF", "RESOLVING DEPENDENCIES...", true],
  scan: ["#38D9FF", "SCANNING FOR VULNERABILITIES...", true],
  vuln: ["#FF4757", "⚠ 2 VULNERABILITIES DETECTED", false],
  fix: ["#00D084", "APPLYING SECURITY PATCHES...", true],
  idle: ["#00D084", "✓ ALL SYSTEMS SECURE", false],
};

export default function CinematicGraph() {
  const [phase, setPhase] = useState<Phase>("init");
  const [nVis, setNVis] = useState(0);
  const [eVis, setEVis] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [vulns, setVulns] = useState<Set<string>>(new Set());
  const [fixed, setFixed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    t.push(setTimeout(() => setPhase("spawn"), 300));
    NODES.forEach((_, i) => t.push(setTimeout(() => setNVis(i + 1), 500 + i * 180)));
    const se = 500 + NODES.length * 180;
    t.push(setTimeout(() => setPhase("connect"), se + 400));
    EDGES.forEach((_, i) => t.push(setTimeout(() => setEVis(i + 1), se + 600 + i * 120)));
    t.push(setTimeout(() => setPhase("scan"), se + 600 + EDGES.length * 120 + 400));
    return () => t.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    switch (phase) {
      case "scan":
        timer = setTimeout(() => {
          setVulns(new Set(["auth", "pay"]));
          setPhase("vuln");
        }, 2500);
        break;
      case "vuln":
        timer = setTimeout(() => setPhase("fix"), 2000);
        break;
      case "fix":
        timer = setTimeout(() => {
          setVulns(new Set());
          setFixed(new Set(["auth", "pay"]));
          setPhase("idle");
        }, 1500);
        break;
      case "idle":
        timer = setTimeout(() => {
          setFixed(new Set());
          setPhase("scan");
        }, 5000);
        break;
      default:
        return;
    }
    return () => clearTimeout(timer);
  }, [phase]);

  const nColor = (id: string): [string, string, string] => {
    if (vulns.has(id)) return ["#FF4757", "rgba(255,71,87,0.12)", "rgba(255,71,87,0.2)"];
    if (fixed.has(id)) return ["#00D084", "rgba(0,208,132,0.12)", "rgba(0,208,132,0.18)"];
    return ["#7B5CFF", "rgba(123,92,255,0.08)", "rgba(123,92,255,0.12)"];
  };

  const eStroke = (a: string, b: string) => {
    if (vulns.has(a) || vulns.has(b)) return "rgba(255,71,87,0.22)";
    if (fixed.has(a) || fixed.has(b)) return "rgba(0,208,132,0.18)";
    return "rgba(123,92,255,0.15)";
  };

  const hn = hovered ? NODE_MAP.get(hovered) : null;
  const [sColor, sText, sPulse] = STATUS[phase];
  const showParticles = eVis >= EDGES.length && (phase === "idle" || phase === "scan");

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{
        aspectRatio: "16 / 10",
        border: "1px solid rgba(123,92,255,0.1)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.35), 0 0 40px rgba(123,92,255,0.04)",
      }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-[#07070e]" />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 45% 38%, rgba(123,92,255,0.045) 0%, transparent 55%)" }}
      />

      {/* Grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
        <defs>
          <pattern id="cgGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0L0 0 0 40" fill="none" stroke="#7B5CFF" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cgGrid)" />
      </svg>

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 45%, rgba(7,7,14,0.55) 100%)",
          zIndex: 3,
        }}
      />

      {/* Graph SVG */}
      <svg viewBox="0 0 800 480" className="absolute inset-0 w-full h-full" style={{ zIndex: 2 }}>
        <defs>
          <filter id="cgGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* Edges */}
        {EDGES.slice(0, eVis).map(([a, b], i) => (
          <path
            key={`e${i}`}
            id={`ep-${a}-${b}`}
            d={edgePath(a, b)}
            fill="none"
            stroke={eStroke(a, b)}
            strokeWidth={1.5}
            pathLength={1}
            strokeDasharray={1}
            className="cg-edge"
            style={{ transition: "stroke 0.6s ease" }}
          />
        ))}

        {/* Scan rings */}
        {phase === "scan" && (
          <>
            <circle cx={400} cy={235} fill="none" stroke="rgba(56,217,255,0.1)" strokeWidth={1.5}>
              <animate attributeName="r" from="0" to="350" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.5" to="0" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle cx={400} cy={235} fill="none" stroke="rgba(56,217,255,0.06)" strokeWidth={1}>
              <animate attributeName="r" from="0" to="350" dur="2.5s" begin="0.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.3" to="0" dur="2.5s" begin="0.8s" repeatCount="indefinite" />
            </circle>
          </>
        )}

        {/* Fix wave */}
        {phase === "fix" && (
          <circle cx={400} cy={235} fill="none" stroke="rgba(0,208,132,0.12)" strokeWidth={2}>
            <animate attributeName="r" from="0" to="400" dur="1.5s" fill="freeze" />
            <animate attributeName="opacity" from="0.45" to="0" dur="1.5s" fill="freeze" />
          </circle>
        )}

        {/* Particles */}
        {showParticles &&
          EDGES.map(([a, b], i) => (
            <circle key={`p${i}`} r={1.5} fill="#7B5CFF" opacity={0.45}>
              <animateMotion dur={`${3 + (i % 4) * 0.7}s`} repeatCount="indefinite" begin={`${i * 0.25}s`}>
                <mpath href={`#ep-${a}-${b}`} />
              </animateMotion>
            </circle>
          ))}

        {/* Nodes */}
        {NODES.slice(0, nVis).map((n, i) => {
          const [stroke, fill, glow] = nColor(n.id);
          const isV = vulns.has(n.id);
          return (
            <g key={n.id}>
              {/* Glow */}
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r * 2.5}
                fill={glow}
                className="cg-spawn"
                style={{ animationDelay: `${i * 180}ms`, transition: "fill 0.6s ease" }}
              />

              {/* Vuln pulse ring */}
              {isV && (
                <circle cx={n.x} cy={n.y} r={n.r * 1.8} fill="none" stroke="#FF4757" strokeWidth={1} className="cg-vuln-ring" />
              )}

              {/* Fixed flash ring */}
              {fixed.has(n.id) && (
                <circle cx={n.x} cy={n.y} r={n.r * 1.8} fill="none" stroke="#00D084" strokeWidth={1.5} className="cg-fix-ring" />
              )}

              {/* Node circle */}
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.5}
                className="cg-spawn"
                style={{ animationDelay: `${i * 180}ms`, transition: "fill 0.6s ease, stroke 0.6s ease" }}
              />

              {/* Inner dot */}
              <circle
                cx={n.x}
                cy={n.y}
                r={3}
                fill={stroke}
                className="cg-spawn"
                style={{ animationDelay: `${i * 180 + 80}ms`, transition: "fill 0.6s ease" }}
              />

              {/* Label */}
              <text
                x={n.x}
                y={n.y + n.r + 16}
                textAnchor="middle"
                fill="rgba(255,255,255,0.4)"
                fontSize={10}
                fontWeight={600}
                letterSpacing="0.06em"
                className="cg-spawn"
                style={{ animationDelay: `${i * 180 + 40}ms` }}
              >
                {n.label.toUpperCase()}
              </text>

              {/* Hit area */}
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r + 14}
                fill="transparent"
                cursor="pointer"
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          );
        })}
      </svg>

      {/* Status panel */}
      <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-3" style={{ zIndex: 5 }}>
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${sPulse ? "animate-pulse" : ""}`}
            style={{ backgroundColor: sColor, boxShadow: `0 0 8px ${sColor}80`, transition: "all 0.4s ease" }}
          />
          <span className="text-[9px] md:text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 truncate">
            {sText}
          </span>
        </div>
        <div className="flex-1 h-px bg-white/[0.04]" />
        <span className="text-[9px] font-mono text-white/20 hidden md:block shrink-0">
          {nVis} nodes · {eVis} edges
        </span>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hn && (
          <motion.div
            key={hovered}
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute pointer-events-none"
            style={{
              zIndex: 10,
              left: `${(hn.x / 800) * 100}%`,
              top: `${(hn.y / 480) * 100}%`,
              transform: "translate(-50%, calc(-100% - 24px))",
            }}
          >
            <div
              className="px-3.5 py-2.5 rounded-lg shadow-2xl max-w-[220px]"
              style={{
                background: "rgba(10,10,18,0.95)",
                border: "1px solid rgba(123,92,255,0.2)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="text-[11px] font-bold text-[#7B5CFF] mb-0.5">{hn.label}</div>
              <div className="text-[10px] text-white/45 leading-relaxed">{hn.tip}</div>
            </div>
            <div
              className="w-2 h-2 mx-auto -mt-[3px]"
              style={{
                background: "rgba(10,10,18,0.95)",
                transform: "rotate(45deg)",
                borderBottom: "1px solid rgba(123,92,255,0.2)",
                borderRight: "1px solid rgba(123,92,255,0.2)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyframes */}
      <style>{`
        .cg-spawn {
          opacity: 0;
          transform-origin: center;
          transform-box: fill-box;
          animation: cgSpawn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes cgSpawn {
          0% { opacity: 0; transform: scale(0); }
          70% { opacity: 1; transform: scale(1.12); }
          100% { opacity: 1; transform: scale(1); }
        }
        .cg-edge {
          animation: cgEdge 0.7s ease-out forwards;
        }
        @keyframes cgEdge {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
        .cg-vuln-ring {
          transform-origin: center;
          transform-box: fill-box;
          animation: cgVuln 1.2s ease-in-out infinite;
        }
        @keyframes cgVuln {
          0%, 100% { transform: scale(0.9); opacity: 0.5; }
          50% { transform: scale(1.4); opacity: 0; }
        }
        .cg-fix-ring {
          transform-origin: center;
          transform-box: fill-box;
          animation: cgFix 0.8s ease-out forwards;
        }
        @keyframes cgFix {
          0% { transform: scale(0.5); opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
