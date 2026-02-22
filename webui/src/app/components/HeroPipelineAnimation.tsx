import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, ArrowRight, GitPullRequest } from "lucide-react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { useResizeObserver } from "../hooks/useResizeObserver";
import {
  getNodes,
  EDGES,
  CLUSTERS,
  edgePath,
  type NodeType,
} from "../utils/graphLayout";

/* ─── Step data ─── */

interface Step {
  bubbleText: string;
  nodeId: string;
}

const STEPS: Step[] = [
  { bubbleText: "Exposed secrets in .env",    nodeId: "env" },
  { bubbleText: "Rotate leaked API keys",     nodeId: "auth" },
  { bubbleText: "Outdated dependency chain",  nodeId: "routes" },
  { bubbleText: "Add .env to .gitignore",     nodeId: "config" },
  { bubbleText: "Cache invalidation risk",    nodeId: "cache" },
];

const CODE_SNIPPET = [
  "# .gitignore",
  ".env",
  ".env.local",
  "*.pem",
  "node_modules/",
];

const DIFF_LINES: { type: "add" | "del"; text: string }[] = [
  { type: "del", text: 'DATABASE_URL=postgres://admin:s3cr3t@host' },
  { type: "del", text: 'STRIPE_KEY=sk_live_4eC39HqLyjWD' },
  { type: "del", text: 'JWT_SECRET=my-super-secret-123' },
  { type: "add", text: 'DOTENV_VAULT=vlt_a1b2c3d4...' },
  { type: "add", text: 'DOTENV_ME=me_encrypted_token' },
  { type: "add", text: '# All keys rotated & encrypted' },
];

const TEST_RESULTS = [
  { name: "auth.test.ts",    pass: true,  ms: 42 },
  { name: "routes.test.ts",  pass: true,  ms: 118 },
  { name: "security.test.ts",pass: true,  ms: 67 },
  { name: "env.test.ts",     pass: true,  ms: 23 },
  { name: "lint",            pass: true,  ms: 340 },
];

const CHECKLIST = [
  "Secrets rotated & encrypted",
  ".env added to .gitignore",
  "All 5 tests passing",
  "Git history scrubbed",
  "Security PR ready",
];

/* ─── Phase enum ─── */

type Phase = "graph" | "bubbles" | "typewriter" | "testing" | "slider" | "success";

/* ─── Node badge icons (tiny inline SVGs) ─── */

function NodeBadge({ type }: { type: NodeType }) {
  const cls = "heroPipeline__badge";
  switch (type) {
    case "secrets":
      return (
        <svg className={cls} viewBox="0 0 12 12" fill="none">
          <path d="M6 2 L10.5 10 H1.5 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <line x1="6" y1="5.5" x2="6" y2="7.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="6" cy="8.4" r="0.5" fill="currentColor" />
        </svg>
      );
    case "code":
      return (
        <svg className={cls} viewBox="0 0 12 12" fill="none">
          <path d="M4.5 3 L2 6 L4.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7.5 3 L10 6 L7.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "config":
      return (
        <svg className={cls} viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="6" cy="6" r="0.8" fill="currentColor" />
          <line x1="6" y1="1" x2="6" y2="3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="6" y1="9" x2="6" y2="11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="1" y1="6" x2="3" y2="6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="9" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      );
    case "deploy":
      return (
        <svg className={cls} viewBox="0 0 12 12" fill="none">
          <path d="M3 4 L5.5 6.5 L3 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="6.5" y1="9" x2="10" y2="9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
  }
}

/* ─── Component ─── */

export default function HeroPipelineAnimation() {
  const prefersReduced = usePrefersReducedMotion();
  const [svgRef, svgSize] = useResizeObserver<HTMLDivElement>();
  const isMobile = svgSize.width > 0 && svgSize.width < 640;
  const nodes = useMemo(() => getNodes(isMobile), [isMobile]);
  const w = svgSize.width || 1;
  const h = svgSize.height || 1;

  /* ── Animation state ── */
  const [phase, setPhase] = useState<Phase>("graph");
  const [drawnEdges, setDrawnEdges] = useState(0);
  const [poppedNodes, setPoppedNodes] = useState(0);
  const [activeStep, setActiveStep] = useState(-1);
  const [typedLines, setTypedLines] = useState(0);
  const [showDiff, setShowDiff] = useState(false);
  const [diffLines, setDiffLines] = useState(0);
  const [testsDone, setTestsDone] = useState(0);
  const [sliderPos, setSliderPos] = useState(75);
  const [showSuccess, setShowSuccess] = useState(false);
  const [checkedItems, setCheckedItems] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  /* Scrub + slider refs */
  const [progress, setProgress] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const scrubRef = useRef<HTMLDivElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const sliderDragging = useRef(false);

  /* ── Autoplay timeline ── */
  useEffect(() => {
    if (!isAutoplay) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const wait = (ms: number) =>
      new Promise<void>((resolve, reject) => {
        if (cancelled) return reject();
        const t = setTimeout(() => {
          if (cancelled) return reject();
          resolve();
        }, ms);
        timers.push(t);
      });

    const totalSteps =
      nodes.length + EDGES.length + STEPS.length +
      CODE_SNIPPET.length + DIFF_LINES.length +
      TEST_RESULTS.length + CHECKLIST.length + 10;
    let step = 0;
    const tick = () => setProgress((++step / totalSteps) * 100);

    const run = async () => {
      try {
        while (!cancelled) {
          step = 0;
          setPhase("graph");
          setDrawnEdges(0);
          setPoppedNodes(0);
          setActiveStep(-1);
          setTypedLines(0);
          setShowDiff(false);
          setDiffLines(0);
          setTestsDone(0);
          setSliderPos(75);
          setShowSuccess(false);
          setCheckedItems(0);
          setProgress(0);

          await wait(prefersReduced ? 0 : 400);

          /* Phase 1 — Graph draw (nodes appear one by one) */
          for (let i = 0; i <= nodes.length; i++) {
            if (cancelled) return;
            setPoppedNodes(i);
            tick();
            await wait(prefersReduced ? 0 : 180 + i * 30);
          }
          await wait(prefersReduced ? 0 : 300);

          /* Phase 1b — Edges draw */
          for (let i = 0; i <= EDGES.length; i++) {
            if (cancelled) return;
            setDrawnEdges(i);
            tick();
            await wait(prefersReduced ? 0 : 220 + i * 25);
          }
          await wait(prefersReduced ? 100 : 800);

          /* Phase 2 — Suggestion bubbles */
          setPhase("bubbles");
          await wait(prefersReduced ? 50 : 300);
          for (let s = 0; s < STEPS.length; s++) {
            if (cancelled) return;
            setActiveStep(s);
            tick();
            await wait(prefersReduced ? 200 : 1400 + s * 80);
          }
          setActiveStep(-1);
          await wait(prefersReduced ? 100 : 600);

          /* Phase 3 — Typewriter + diff */
          setPhase("typewriter");
          await wait(prefersReduced ? 50 : 350);
          for (let l = 0; l <= CODE_SNIPPET.length; l++) {
            if (cancelled) return;
            setTypedLines(l);
            tick();
            await wait(prefersReduced ? 0 : 340);
          }
          await wait(prefersReduced ? 100 : 700);

          setShowDiff(true);
          await wait(prefersReduced ? 50 : 250);
          for (let d = 0; d <= DIFF_LINES.length; d++) {
            if (cancelled) return;
            setDiffLines(d);
            tick();
            await wait(prefersReduced ? 0 : 420);
          }
          await wait(prefersReduced ? 200 : 1000);

          /* Phase 4 — Testing */
          setPhase("testing");
          await wait(prefersReduced ? 50 : 350);
          for (let t = 0; t <= TEST_RESULTS.length; t++) {
            if (cancelled) return;
            setTestsDone(t);
            tick();
            await wait(prefersReduced ? 100 : 600);
          }
          await wait(prefersReduced ? 300 : 1200);

          /* Phase 5 — Before/After slider */
          setPhase("slider");
          setSliderPos(75);
          await wait(prefersReduced ? 100 : 800);
          for (let pos = 75; pos >= 25; pos -= 2) {
            if (cancelled) return;
            if (!sliderDragging.current) setSliderPos(pos);
            await wait(prefersReduced ? 0 : 55);
          }
          tick();
          await wait(prefersReduced ? 600 : 3200);

          /* Phase 6 — Success */
          setPhase("success");
          setShowSuccess(true);
          await wait(prefersReduced ? 50 : 300);
          for (let c = 0; c <= CHECKLIST.length; c++) {
            if (cancelled) return;
            setCheckedItems(c);
            tick();
            await wait(prefersReduced ? 100 : 500);
          }
          setProgress(100);
          await wait(prefersReduced ? 1000 : 4500);
        }
      } catch {
        /* cancelled — expected on cleanup, do nothing */
      }
    };

    run();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [isAutoplay, nodes, prefersReduced]);

  /* ── Slider drag ── */
  const handleSliderDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    sliderDragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!sliderContainerRef.current) return;
      const rect = sliderContainerRef.current.getBoundingClientRect();
      setSliderPos(Math.max(5, Math.min(95, ((ev.clientX - rect.left) / rect.width) * 100)));
    };
    const onUp = () => {
      sliderDragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  /* ── Scrub handler ── */
  const handleScrub = useCallback((e: React.MouseEvent) => {
    if (!scrubRef.current) return;
    const rect = scrubRef.current.getBoundingClientRect();
    setIsAutoplay(false);
    setProgress(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
  }, []);

  /* ── Highlight path on hover ── */
  const highlightedEdges = useMemo(() => {
    if (!hoveredNode) return new Set<number>();
    const set = new Set<number>();
    EDGES.forEach((edge, i) => {
      if (edge.from === hoveredNode || edge.to === hoveredNode) set.add(i);
    });
    return set;
  }, [hoveredNode]);

  const nodePop = { type: "spring" as const, stiffness: 400, damping: 25 };
  const bubbleSpring = { type: "spring" as const, stiffness: 350, damping: 22 };

  const hoveredNodeData = hoveredNode
    ? nodes.find((n) => n.id === hoveredNode)
    : null;

  const sliderW = sliderContainerRef.current?.offsetWidth ?? 400;

  return (
    <div className="heroPipeline" ref={svgRef}>
      <div className="heroPipeline__grid" />

      {/* ── SVG layer: clusters + edges ── */}
      <svg className="heroPipeline__svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="hp-edge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="hp-crit" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <linearGradient id="hp-sweep" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
            <stop offset="40%" stopColor="#c084fc" stopOpacity="1" />
            <stop offset="60%" stopColor="#e9d5ff" stopOpacity="1" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
            <animate attributeName="x1" from="-100%" to="100%" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="x2" from="0%" to="200%" dur="2.5s" repeatCount="indefinite" />
          </linearGradient>
          <filter id="hp-clusterBlur">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        {/* Cluster halos */}
        {CLUSTERS.map((c, i) => (
          <ellipse
            key={`cl-${i}`}
            cx={(c.cx / 100) * w}
            cy={(c.cy / 100) * h}
            rx={(c.rx / 100) * w}
            ry={(c.ry / 100) * h}
            fill="rgba(139,92,246,0.04)"
            filter="url(#hp-clusterBlur)"
          />
        ))}

        {EDGES.slice(0, drawnEdges).map((edge, i) => {
          const d = edgePath(nodes, edge, w, h);
          const lit = highlightedEdges.has(i) || phase === "success";
          const crit = edge.critical;
          return (
            <g key={`e-${i}`}>
              <motion.path
                d={d}
                stroke={crit ? "url(#hp-crit)" : "url(#hp-edge)"}
                strokeWidth={lit ? 2.8 : 1.2}
                fill="none"
                strokeLinecap="round"
                opacity={lit ? 0.9 : 0.3}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: prefersReduced ? 0 : 0.7, delay: i * 0.06, ease: [0.33, 1, 0.68, 1] }}
              />
              {lit && !prefersReduced && (
                <motion.path
                  d={d}
                  stroke="url(#hp-sweep)"
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.6}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.04 }}
                />
              )}
              {!prefersReduced && phase !== "success" && (
                <circle r={crit ? 1.8 : 1.2} fill={crit ? "#f87171" : "#a78bfa"} opacity={lit ? 0.8 : 0.35}>
                  <animateMotion dur={crit ? "2.5s" : "4s"} repeatCount="indefinite" path={d} />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* ── Nodes ── */}
      {nodes.slice(0, poppedNodes).map((node, i) => {
        const isEnv = node.id === "env";
        const isHovered = hoveredNode === node.id;
        const isActive = activeStep >= 0 && STEPS[activeStep]?.nodeId === node.id;
        const resolved = phase === "success";

        return (
          <motion.div
            key={node.id}
            className={[
              "heroPipeline__node",
              `tier-${node.tier}`,
              `type-${node.type}`,
              isEnv ? "critical" : "",
              resolved ? "resolved" : "",
              isActive ? "active" : "",
            ].filter(Boolean).join(" ")}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            initial={prefersReduced ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 0.85, filter: "blur(4px)" }}
            animate={{ opacity: node.tier === "tertiary" && !isHovered ? 0.7 : 1, scale: isActive || isHovered ? 1.25 : 1, filter: "blur(0px)" }}
            transition={{ ...nodePop, delay: prefersReduced ? 0 : i * 0.07 }}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            <span className="heroPipeline__nodeRing" />
            <span className="heroPipeline__nodeCore" />
            {(isActive || (isEnv && phase === "bubbles")) && (
              <motion.span
                className="heroPipeline__pulse"
                animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
            )}
            {isEnv && !resolved && (
              <motion.span
                className="heroPipeline__alertRing"
                animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <span className="heroPipeline__badgeWrap">
              <NodeBadge type={node.type} />
            </span>
          </motion.div>
        );
      })}

      {/* ── Hover tooltip (pill label + meta) ── */}
      <AnimatePresence>
        {hoveredNodeData && (
          <motion.div
            className={`heroPipeline__tooltip type-${hoveredNodeData.type}`}
            style={{ left: `${hoveredNodeData.x}%`, top: `${hoveredNodeData.y - 8}%` }}
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.92 }}
            transition={{ duration: 0.15 }}
          >
            <span className="heroPipeline__tooltipFile">{hoveredNodeData.label}</span>
            <span className="heroPipeline__tooltipMeta">
              {hoveredNodeData.id === "env" ? "CRITICAL — secrets exposed" : hoveredNodeData.type}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Suggestion bubbles ── */}
      <AnimatePresence mode="wait">
        {phase === "bubbles" && activeStep >= 0 && activeStep < STEPS.length && (
          <motion.div
            key={`bub-${activeStep}`}
            className="heroPipeline__bubble"
            style={{
              left: `${Math.min((nodes.find((n) => n.id === STEPS[activeStep].nodeId)?.x ?? 50) + 6, 72)}%`,
              top: `${(nodes.find((n) => n.id === STEPS[activeStep].nodeId)?.y ?? 50) - 4}%`,
            }}
            initial={{ opacity: 0, scale: 0.88, filter: "blur(3px)", x: -6 }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)", x: 0 }}
            exit={{ opacity: 0, scale: 0.92, filter: "blur(2px)", x: 8 }}
            transition={bubbleSpring}
          >
            <span className="heroPipeline__bubbleDot" />
            <span className="heroPipeline__bubbleText">{STEPS[activeStep].bubbleText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Typewriter + diff ── */}
      <AnimatePresence>
        {phase === "typewriter" && (
          <motion.div
            className="heroPipeline__codePanel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
          >
            <div className="heroPipeline__codeBlock">
              <div className="heroPipeline__codeHeader">
                <span className="heroPipeline__codeDot" style={{ background: "#f87171" }} />
                <span className="heroPipeline__codeDot" style={{ background: "#fbbf24" }} />
                <span className="heroPipeline__codeDot" style={{ background: "#34d399" }} />
                <span className="heroPipeline__codeTitle">.gitignore</span>
              </div>
              <div className="heroPipeline__codeBody">
                {CODE_SNIPPET.slice(0, typedLines).map((line, i) => (
                  <motion.div key={`cl-${i}`} className="heroPipeline__codeLine" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: i * 0.04 }}>
                    <span className="heroPipeline__lineNum">{i + 1}</span>
                    <span className="heroPipeline__lineText">{line}</span>
                  </motion.div>
                ))}
                {typedLines < CODE_SNIPPET.length && <span className="heroPipeline__cursor" />}
              </div>
            </div>

            {showDiff && (
              <motion.div className="heroPipeline__codeBlock diff" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="heroPipeline__codeHeader">
                  <span className="heroPipeline__codeTitle">credential rotation</span>
                </div>
                <div className="heroPipeline__codeBody">
                  {DIFF_LINES.slice(0, diffLines).map((line, i) => (
                    <motion.div key={`dl-${i}`} className={`heroPipeline__codeLine ${line.type}`} initial={{ opacity: 0, x: line.type === "add" ? -4 : 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: i * 0.05 }}>
                      <span className="heroPipeline__lineNum">{line.type === "add" ? "+" : "−"}</span>
                      <span className="heroPipeline__lineText">{line.text}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Test runner ── */}
      <AnimatePresence>
        {phase === "testing" && (
          <motion.div
            className="heroPipeline__codePanel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] }}
          >
            <div className="heroPipeline__codeBlock">
              <div className="heroPipeline__codeHeader">
                <span className="heroPipeline__codeTitle">running tests</span>
              </div>
              <div className="heroPipeline__codeBody">
                {TEST_RESULTS.slice(0, testsDone).map((t, i) => (
                  <motion.div
                    key={`tr-${i}`}
                    className="heroPipeline__testRow"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                  >
                    <span className="heroPipeline__testIcon">{t.pass ? "✓" : "✗"}</span>
                    <span className="heroPipeline__testName">{t.name}</span>
                    <span className="heroPipeline__testMs">{t.ms}ms</span>
                  </motion.div>
                ))}
                {testsDone < TEST_RESULTS.length && (
                  <span className="heroPipeline__testSpinner" />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Before / After slider ── */}
      <AnimatePresence>
        {phase === "slider" && (
          <motion.div
            className="heroPipeline__codePanel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
          >
            <div
              ref={sliderContainerRef}
              className="heroPipeline__slider"
              style={{ userSelect: "none" }}
            >
              {/* BEFORE side */}
              <div className="heroPipeline__sliderSide before" style={{ width: `${sliderPos}%` }}>
                <div className="heroPipeline__sliderContent" style={{ minWidth: sliderW }}>
                  <div className="heroPipeline__sliderLabel" style={{ color: "#f87171" }}>BEFORE</div>
                  <div className="heroPipeline__sliderCode">
                    <div className="heroPipeline__sliderLine del">
                      <span className="heroPipeline__sliderKey">DATABASE_URL</span>=postgres://admin:<span className="heroPipeline__sliderSecret">s3cr3tP@ss</span>@db
                    </div>
                    <div className="heroPipeline__sliderLine del">
                      <span className="heroPipeline__sliderKey">STRIPE_KEY</span>=sk_live_<span className="heroPipeline__sliderSecret">4eC39HqLyjWD</span>
                    </div>
                    <div className="heroPipeline__sliderLine del">
                      <span className="heroPipeline__sliderKey">JWT_SECRET</span>=<span className="heroPipeline__sliderSecret">my-super-secret</span>
                    </div>
                    <div className="heroPipeline__sliderLine del">
                      <span className="heroPipeline__sliderKey">AWS_KEY</span>=<span className="heroPipeline__sliderSecret">AKIA5EXAMPLE</span>
                    </div>
                    <div className="heroPipeline__sliderWarn">WARNING: Secrets committed</div>
                  </div>
                </div>
              </div>

              {/* AFTER side */}
              <div className="heroPipeline__sliderSide after" style={{ width: `${100 - sliderPos}%` }}>
                <div className="heroPipeline__sliderContent">
                  <div className="heroPipeline__sliderLabel" style={{ color: "#34d399" }}>AFTER</div>
                  <div className="heroPipeline__sliderCode">
                    <div className="heroPipeline__sliderLine add">
                      <span className="heroPipeline__sliderKey">DOTENV_VAULT</span>=<span className="heroPipeline__sliderSafe">vlt_a1b2c3...</span>
                    </div>
                    <div className="heroPipeline__sliderLine add">
                      <span className="heroPipeline__sliderKey">DOTENV_ME</span>=<span className="heroPipeline__sliderSafe">me_encrypted</span>
                    </div>
                    <div className="heroPipeline__sliderLine dim"># All keys rotated & encrypted</div>
                    <div className="heroPipeline__sliderLine dim"># .env added to .gitignore</div>
                    <div className="heroPipeline__sliderLine dim"># Git history scrubbed</div>
                    <div className="heroPipeline__sliderOk">
                      <CheckCircle2 className="w-3 h-3" />
                      SECURED — 0 secrets exposed
                    </div>
                  </div>
                </div>
              </div>

              {/* Handle */}
              <div
                className="heroPipeline__sliderHandle"
                style={{ left: `${sliderPos}%` }}
                onMouseDown={handleSliderDown}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Success checklist ── */}
      <AnimatePresence>
        {showSuccess && phase === "success" && (
          <motion.div
            className="heroPipeline__successPanel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
          >
            {CHECKLIST.map((item, i) => (
              <motion.div
                key={`chk-${i}`}
                className="heroPipeline__checkItem"
                initial={{ opacity: 0, x: -8 }}
                animate={i < checkedItems ? { opacity: 1, x: 0 } : { opacity: 0.3, x: -8 }}
                transition={{ duration: 0.35, delay: i * 0.08, ease: [0.33, 1, 0.68, 1] }}
              >
                <CheckCircle2
                  className="heroPipeline__checkIcon"
                  style={{ color: i < checkedItems ? "#34d399" : "rgba(255,255,255,0.15)" }}
                />
                <span>{item}</span>
              </motion.div>
            ))}

            {checkedItems >= CHECKLIST.length && (
              <motion.button
                className="heroPipeline__prBtn"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.35 }}
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                Create Security PR
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scrub bar ── */}
      <div className="heroPipeline__scrubWrap">
        <div ref={scrubRef} className="heroPipeline__scrubTrack" onMouseDown={handleScrub}>
          <motion.div className="heroPipeline__scrubFill" style={{ width: `${progress}%` }} />
        </div>
        <button className="heroPipeline__playBtn" onClick={() => setIsAutoplay((v) => !v)}>
          {isAutoplay ? "⏸" : "▶"}
        </button>
      </div>

      {/* ── Phase label ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          className="heroPipeline__phaseLabel"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          {phase === "graph" && "Mapping codebase"}
          {phase === "bubbles" && "Analyzing vulnerabilities"}
          {phase === "typewriter" && "Applying automated fix"}
          {phase === "testing" && "Running verification suite"}
          {phase === "slider" && "Before → After"}
          {phase === "success" && "All checks passed"}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
