import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, ArrowRight, GitPullRequest } from "lucide-react";

type GraphState =
  | "traveling"
  | "analyzing"
  | "suggestions"
  | "zoom"
  | "building"
  | "slider";

type NodeType = "standard" | "critical" | "healthy" | "cyan";

interface NodeDef {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  label: string;
  commit: string;
  type: NodeType;
}

interface Suggestion {
  id: number;
  title: string;
  nodeId: number;
  priority: "CRITICAL" | "MEDIUM" | "LOW";
  color: string;
  borderColor: string;
}

const nodes: NodeDef[] = [
  { id: 1, startX: 45, startY: 45, endX: 15, endY: 22, label: "config.yml", commit: "a3f1c2d", type: "standard" },
  { id: 2, startX: 45, startY: 45, endX: 38, endY: 16, label: "auth.ts", commit: "e7b24a1", type: "standard" },
  { id: 3, startX: 45, startY: 45, endX: 52, endY: 40, label: ".env", commit: "LEAKED", type: "critical" },
  { id: 4, startX: 45, startY: 45, endX: 72, endY: 18, label: "api/routes.ts", commit: "9d4f8e2", type: "standard" },
  { id: 5, startX: 45, startY: 45, endX: 20, endY: 62, label: "theme.ts", commit: "b5c3a7f", type: "cyan" },
  { id: 6, startX: 45, startY: 45, endX: 52, endY: 68, label: "cache.ts", commit: "2f8e1d9", type: "healthy" },
  { id: 7, startX: 45, startY: 45, endX: 80, endY: 60, label: "docs/readme", commit: "1a2b3c4", type: "standard" },
];

const connections: { from: number; to: number; type: NodeType }[] = [
  { from: 1, to: 2, type: "standard" },
  { from: 2, to: 3, type: "critical" },
  { from: 3, to: 4, type: "critical" },
  { from: 2, to: 5, type: "cyan" },
  { from: 4, to: 6, type: "healthy" },
  { from: 5, to: 6, type: "standard" },
  { from: 6, to: 7, type: "healthy" },
  { from: 4, to: 7, type: "standard" },
];

const suggestions: Suggestion[] = [
  { id: 1, title: "Security: .env exposed in commit history", nodeId: 3, priority: "CRITICAL", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" },
  { id: 2, title: "Strengthen JWT token validation", nodeId: 2, priority: "CRITICAL", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" },
  { id: 3, title: "Implement dark mode toggle", nodeId: 5, priority: "MEDIUM", color: "#a78bfa", borderColor: "rgba(167,139,250,0.15)" },
  { id: 4, title: "Add rate limiting to API endpoints", nodeId: 4, priority: "MEDIUM", color: "#fbbf24", borderColor: "rgba(251,191,36,0.15)" },
  { id: 5, title: "Optimize cache invalidation", nodeId: 6, priority: "LOW", color: "#34d399", borderColor: "rgba(52,211,153,0.15)" },
  { id: 6, title: "Update API documentation", nodeId: 7, priority: "LOW", color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.06)" },
];

const buildPlan = [
  "Scanning commit history for .env exposure",
  "Revoking leaked API keys and secrets",
  "Adding .env to .gitignore",
  "Rotating all exposed credentials",
  "Implementing .env.vault encryption",
  "Validating fix across dependency graph",
  "Generating comprehensive security audit",
  "Preparing pull request for review",
  "Generating security audit report",
];

export default function InteractiveNodeGraph() {
  const [state, setState] = useState<GraphState>("traveling");
  const [nodePositions, setNodePositions] = useState<Record<number, { x: number; y: number }>>({});
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [planItems, setPlanItems] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(75);
  const [zoomTarget, setZoomTarget] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);
  const sliderDragging = useRef(false);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  const delay = useCallback((ms: number) => {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (!cancelRef.current) resolve();
      }, ms);
      return () => clearTimeout(timer);
    });
  }, []);

  useEffect(() => {
    cancelRef.current = false;

    const runAnimation = async () => {
      while (!cancelRef.current) {
        setShowPanel(false);
        setPlanItems(0);
        setSliderPosition(75);
        setZoomTarget(null);
        setActiveSuggestion(0);

        setState("traveling");
        const startPositions: Record<number, { x: number; y: number }> = {};
        nodes.forEach((n) => { startPositions[n.id] = { x: n.startX, y: n.startY }; });
        setNodePositions(startPositions);
        await delay(800);
        if (cancelRef.current) break;

        setState("analyzing");
        const endPositions: Record<number, { x: number; y: number }> = {};
        nodes.forEach((n) => { endPositions[n.id] = { x: n.endX, y: n.endY }; });
        setNodePositions(endPositions);
        await delay(3200);
        if (cancelRef.current) break;

        setState("suggestions");
        for (let i = 0; i < suggestions.length; i++) {
          if (cancelRef.current) break;
          setActiveSuggestion(i);
          await delay(2800);
        }
        if (cancelRef.current) break;
        await delay(600);

        setState("zoom");
        const securityNode = nodes.find((n) => n.id === 3)!;
        setZoomTarget({ x: securityNode.endX, y: securityNode.endY });
        await delay(3500);
        if (cancelRef.current) break;

        setState("building");
        setShowPanel(true);
        await delay(500);
        if (cancelRef.current) break;

        for (let i = 0; i < buildPlan.length; i++) {
          if (cancelRef.current) break;
          setPlanItems(i + 1);
          await delay(750);
        }
        if (cancelRef.current) break;
        await delay(1200);

        setState("slider");
        for (let pos = 75; pos >= 25; pos -= 2) {
          if (cancelRef.current) break;
          if (!sliderDragging.current) {
            setSliderPosition(pos);
          }
          await delay(50);
        }
        await delay(4000);
        if (cancelRef.current) break;
      }
    };

    runAnimation();

    return () => {
      cancelRef.current = true;
    };
  }, [delay]);

  const getNodePosition = (nodeId: number) => {
    const pos = nodePositions[nodeId];
    if (!pos || !containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return { x: (pos.x / 100) * rect.width, y: (pos.y / 100) * rect.height };
  };

  const handleSliderMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    sliderDragging.current = true;

    const onMove = (ev: MouseEvent) => {
      if (!sliderContainerRef.current) return;
      const rect = sliderContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      setSliderPosition(x);
    };

    const onUp = () => {
      sliderDragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const cameraStyle: React.CSSProperties = state === "zoom" && zoomTarget
    ? {
        transform: `scale(1.6) translate(${-(zoomTarget.x - 50) * 0.6}%, ${-(zoomTarget.y - 50) * 0.6}%)`,
        transition: "transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }
    : {
        transform: "scale(1) translate(0, 0)",
        transition: "transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
      };

  const priorityDot = (color: string) => (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );

  return (
    <div ref={containerRef} className="nexus-large-graph-container">
      {/* Subtle background */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 45% 40%, rgba(167,139,250,0.03) 0%, transparent 60%)" }}
        />
      </div>

      {/* Camera wrapper for zoom effect */}
      <div className="absolute inset-0" style={cameraStyle}>
        {/* SVG for connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
          <defs>
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="connectionCritical" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="connectionHealthy" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="connectionCyan" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id="glowV" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowR" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowG" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Connections */}
          {state !== "traveling" && connections.map((conn, i) => {
            const fromPos = getNodePosition(conn.from);
            const toPos = getNodePosition(conn.to);
            const dx = toPos.x - fromPos.x;
            const dy = toPos.y - fromPos.y;
            const midX = (fromPos.x + toPos.x) / 2;
            const midY = (fromPos.y + toPos.y) / 2;
            const ox = -dy * 0.12;
            const oy = dx * 0.12;
            const pathD = `M ${fromPos.x} ${fromPos.y} Q ${midX + ox} ${midY + oy} ${toPos.x} ${toPos.y}`;

            const gradMap: Record<NodeType, string> = {
              standard: "url(#connectionGradient)",
              critical: "url(#connectionCritical)",
              healthy: "url(#connectionHealthy)",
              cyan: "url(#connectionCyan)",
            };
            const filtMap: Record<NodeType, string> = {
              standard: "url(#glowV)",
              critical: "url(#glowR)",
              healthy: "url(#glowG)",
              cyan: "url(#glowV)",
            };
            const fillMap: Record<NodeType, string> = {
              standard: "#a78bfa",
              critical: "#f87171",
              healthy: "#34d399",
              cyan: "#94a3b8",
            };
            const isCrit = conn.type === "critical";

            return (
              <g key={`c-${i}`}>
                <motion.path d={pathD} stroke={gradMap[conn.type]} strokeWidth={isCrit ? 1.5 : 0.8} fill="none" opacity={isCrit ? 0.5 : 0.25} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: i * 0.1 }} />
                <motion.path d={pathD} stroke={gradMap[conn.type]} strokeWidth={0.5} fill="none" opacity={0.35} strokeDasharray="2 8" strokeLinecap="round" initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: -40 }} transition={{ duration: isCrit ? 1.5 : 3, repeat: Infinity, ease: "linear", delay: i * 0.1 }} />
                <circle r={isCrit ? 2 : 1.5} fill={fillMap[conn.type]} opacity={0.6} filter={filtMap[conn.type]}>
                  <animateMotion dur={isCrit ? "2s" : "3.5s"} repeatCount="indefinite" path={pathD} />
                </circle>
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = nodePositions[node.id];
          if (!pos) return null;

          const isActive = state === "suggestions" && suggestions[activeSuggestion]?.nodeId === node.id;
          const isZoomed = state === "zoom" && node.id === 3;

          return (
            <motion.div
              key={node.id}
              className={`nexus-interactive-node ${node.type} ${isActive || isZoomed ? "large" : ""}`}
              animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
              style={{ transform: "translate(-50%, -50%)" }}
            >
              {(isActive || isZoomed) && (
                <motion.div
                  className="absolute inset-[-6px] rounded-full"
                  style={{ border: `1px solid ${node.type === "critical" ? "rgba(248,113,113,0.35)" : "rgba(167,139,250,0.25)"}` }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}

              {state !== "traveling" && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 flex flex-col items-center">
                  <span className="text-[9px] font-mono font-medium tracking-wide text-white/35 whitespace-nowrap">
                    {node.label}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}

        {state === "analyzing" && (
          <motion.div
            className="absolute top-0 left-0 w-full pointer-events-none"
            style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.35), transparent)", zIndex: 8 }}
            initial={{ top: "0%" }}
            animate={{ top: "100%" }}
            transition={{ duration: 2.5, ease: "linear", repeat: Infinity }}
          />
        )}
      </div>

      {/* Suggestion Bubbles */}
      <AnimatePresence mode="wait">
        {state === "suggestions" && suggestions[activeSuggestion] && (
          <motion.div
            key={`sug-${activeSuggestion}`}
            initial={{ opacity: 0, scale: 0.92, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, x: 8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="pointer-events-none"
            style={{
              position: "absolute",
              left: `${Math.min(nodes[suggestions[activeSuggestion].nodeId - 1].endX + 7, 62)}%`,
              top: `${nodes[suggestions[activeSuggestion].nodeId - 1].endY - 2}%`,
              transform: "translateY(-50%)",
              zIndex: 35,
            }}
          >
            <div
              style={{
                background: "rgba(12, 12, 18, 0.94)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "6px",
                padding: "12px 16px",
                minWidth: "200px",
                maxWidth: "260px",
                backdropFilter: "blur(16px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {priorityDot(suggestions[activeSuggestion].color)}
                <span
                  className="text-[9px] font-semibold uppercase tracking-wider"
                  style={{ color: suggestions[activeSuggestion].color }}
                >
                  {suggestions[activeSuggestion].priority}
                </span>
              </div>
              <div className="text-[12px] font-medium text-white/75 leading-snug">
                {suggestions[activeSuggestion].title}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom overlay label */}
      <AnimatePresence>
        {state === "zoom" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-6 left-6 right-6 pointer-events-none"
            style={{ zIndex: 50 }}
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-md" style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.12)", backdropFilter: "blur(8px)" }}>
              <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
              <div>
                <div className="text-[12px] font-semibold text-red-400/80 tracking-wide uppercase">Security breach detected</div>
                <div className="text-[11px] text-white/35">.env file with API keys exposed in commit history</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Build Plan Panel */}
      <div className={`nexus-build-panel ${showPanel ? "active" : ""}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
          <div className="nexus-build-panel-header" style={{ marginBottom: 0 }}>Security Fix</div>
        </div>
        <div className="nexus-build-panel-subtitle">
          Remediating: .env credential exposure
        </div>

        <div className="space-y-0">
          {buildPlan.slice(0, planItems).map((item, i) => (
            <motion.div
              key={`plan-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="nexus-plan-item"
            >
              <div className="nexus-plan-item-number">{i + 1}</div>
              <div className="nexus-plan-item-text">{item}</div>
            </motion.div>
          ))}
        </div>

        {/* Before/After Slider */}
        {state === "slider" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5"
          >
            <div ref={sliderContainerRef} className="nexus-ba-slider-container" style={{ height: "240px", userSelect: "none" }}>
              {/* BEFORE side */}
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPosition}%` }}>
                <div className="absolute top-0 left-0 right-0 bottom-0" style={{ background: "rgba(40,15,15,0.95)", minWidth: sliderContainerRef.current ? sliderContainerRef.current.offsetWidth : 300 }}>
                  <div className="nexus-ba-slider-label" style={{ left: 12, color: "#FF4757" }}>BEFORE</div>
                  <div className="p-4 pt-10 font-mono text-[10px] leading-relaxed">
                    <div className="text-red-400/80"># .env — EXPOSED IN GIT HISTORY</div>
                    <div className="text-white/70 mt-1">
                      <span className="text-red-400">DATABASE_URL</span>=postgres://admin:<span className="bg-red-500/30 text-red-300 px-0.5">s3cr3tP@ss</span>@db.host:5432
                    </div>
                    <div className="text-white/70">
                      <span className="text-red-400">STRIPE_KEY</span>=sk_live_<span className="bg-red-500/30 text-red-300 px-0.5">4eC39HqLyjWD</span>
                    </div>
                    <div className="text-white/70">
                      <span className="text-red-400">JWT_SECRET</span>=<span className="bg-red-500/30 text-red-300 px-0.5">my-super-secret-123</span>
                    </div>
                    <div className="text-white/70">
                      <span className="text-red-400">AWS_KEY</span>=<span className="bg-red-500/30 text-red-300 px-0.5">AKIA5EXAMPLE</span>
                    </div>
                    <div className="text-red-500/60 mt-2 text-[9px]">WARNING: Secrets committed to repo</div>
                  </div>
                </div>
              </div>

              {/* AFTER side */}
              <div className="absolute top-0 right-0 bottom-0 overflow-hidden" style={{ width: `${100 - sliderPosition}%` }}>
                <div className="absolute top-0 left-0 right-0 bottom-0" style={{ background: "rgba(10,30,20,0.95)" }}>
                  <div className="nexus-ba-slider-label" style={{ right: 12, color: "#00D084" }}>AFTER</div>
                  <div className="p-4 pt-10 font-mono text-[10px] leading-relaxed">
                    <div className="text-green-400/80"># .env.vault — Encrypted & Secure</div>
                    <div className="text-white/70 mt-1">
                      <span className="text-green-400">DOTENV_VAULT</span>=<span className="bg-green-500/20 text-green-300 px-0.5">vlt_a1b2c3...</span>
                    </div>
                    <div className="text-white/70">
                      <span className="text-green-400">DOTENV_ME</span>=<span className="bg-green-500/20 text-green-300 px-0.5">me_encrypted</span>
                    </div>
                    <div className="text-white/50 mt-1"># All keys rotated & encrypted</div>
                    <div className="text-white/50"># .env added to .gitignore</div>
                    <div className="text-white/50"># Git history scrubbed</div>
                    <div className="flex items-center gap-1 mt-2">
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                      <span className="text-green-400/80 text-[9px]">SECURED — 0 secrets exposed</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Handle */}
              <div
                className="nexus-ba-slider-handle"
                style={{ left: `${sliderPosition}%`, zIndex: 25, cursor: "ew-resize" }}
                onMouseDown={handleSliderMouseDown}
              />
            </div>
          </motion.div>
        )}

        {planItems >= buildPlan.length && state === "building" && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="nexus-btn nexus-btn-primary w-full mt-5"
            style={{ background: "linear-gradient(135deg, #00D084, #00A86B)" }}
          >
            <GitPullRequest className="w-4 h-4" />
            Create Security PR
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </div>
  );
}
