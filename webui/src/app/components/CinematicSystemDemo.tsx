import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2 } from "lucide-react";

type Phase = "scraping" | "graph" | "suggestions" | "implementation";

interface Node {
  id: number;
  x: number;
  y: number;
  label: string;
  active: boolean;
}

const suggestions = [
  { title: "Add caching layer", risk: "Low", files: 3 },
  { title: "Extract service boundary", risk: "Medium", files: 5 },
  { title: "Reduce circular dependency", risk: "Low", files: 2 },
];

const implementationSteps = [
  "Creating files...",
  "Updating imports...",
  "Running tests...",
  "Restructuring graph...",
];

export default function CinematicSystemDemo() {
  const [phase, setPhase] = useState<Phase>("scraping");
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [currentSuggestion, setCurrentSuggestion] = useState(0);
  const [implementationStep, setImplementationStep] = useState(0);
  const [showPerformance, setShowPerformance] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const runAnimation = async () => {
      // Reset
      setPhase("scraping");
      setTerminalLines([]);
      setNodes([]);
      setCurrentSuggestion(0);
      setImplementationStep(0);
      setShowPerformance(false);

      // Phase 1: GitHub Scraping
      await delay(500);
      setTerminalLines(["Cloning repository..."]);
      await delay(1000);
      setTerminalLines((prev) => [...prev, "Parsing structure..."]);
      await delay(1000);
      setTerminalLines((prev) => [...prev, "Analyzing dependencies..."]);
      await delay(1500);

      // Phase 2: Node Graph
      setPhase("graph");
      const initialNodes: Node[] = [
        { id: 1, x: 30, y: 30, label: "Auth", active: true },
        { id: 2, x: 50, y: 20, label: "Core", active: true },
        { id: 3, x: 70, y: 30, label: "API", active: true },
        { id: 4, x: 40, y: 50, label: "DB", active: true },
        { id: 5, x: 60, y: 50, label: "Cache", active: true },
        { id: 6, x: 50, y: 70, label: "Queue", active: true },
      ];

      for (let i = 0; i < initialNodes.length; i++) {
        await delay(300);
        setNodes((prev) => [...prev, initialNodes[i]]);
      }

      await delay(1500);

      // Phase 3: Suggestions
      setPhase("suggestions");
      for (let i = 0; i < suggestions.length; i++) {
        setCurrentSuggestion(i);
        await delay(2000);
      }

      await delay(500);

      // Phase 4: Implementation
      setPhase("implementation");
      for (let i = 0; i < implementationSteps.length; i++) {
        setImplementationStep(i);
        await delay(1000);

        // Restructure graph
        if (i === 3) {
          setNodes((prev) =>
            prev.map((node) =>
              node.id === 5
                ? { ...node, x: 65, y: 45 }
                : node.id === 2
                ? { ...node, x: 48, y: 25 }
                : node
            )
          );
        }
      }

      await delay(800);
      setShowPerformance(true);
      await delay(2500);

      // Loop
      runAnimation();
    };

    runAnimation();
  }, []);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const getNodePosition = (node: Node) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (node.x / 100) * rect.width,
      y: (node.y / 100) * rect.height,
    };
  };

  return (
    <div ref={containerRef} className="relative w-full h-[700px] overflow-hidden">
      {/* Background Glows */}
      <div className="nexus-glow-purple" style={{ top: '10%', left: '20%' }} />
      <div className="nexus-glow-magenta" style={{ bottom: '20%', right: '10%' }} />

      {/* Phase Indicator */}
      <div className="absolute top-6 left-6 z-20">
        <div className="nexus-phase-indicator">
          <div className="nexus-phase-dot" />
          {phase === "scraping" && "Analyzing Repository"}
          {phase === "graph" && "Building Graph"}
          {phase === "suggestions" && "AI Suggestions"}
          {phase === "implementation" && "Auto-Building"}
        </div>
      </div>

      {/* Phase 1: Terminal */}
      <AnimatePresence>
        {phase === "scraping" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center z-10"
          >
            <div className="nexus-terminal-cinematic w-full max-w-2xl">
              <div className="nexus-terminal-cinematic-content">
                <div className="nexus-terminal-header">
                  GITHUB REPOSITORY ANALYSIS
                </div>
                <div className="nexus-terminal-body p-6">
                  {terminalLines.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="nexus-terminal-line mb-2"
                    >
                      <span>{line}</span>
                      {i === terminalLines.length - 1 && (
                        <span className="nexus-terminal-cursor" />
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 2 & 3 & 4: Graph with Overlays */}
      <AnimatePresence>
        {(phase === "graph" || phase === "suggestions" || phase === "implementation") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10"
          >
            {/* SVG Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <linearGradient id="largeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7B5CFF" />
                  <stop offset="100%" stopColor="#C14CFF" />
                </linearGradient>
              </defs>

              {/* Draw connections */}
              {nodes.map((node, i) => {
                if (i === 0) return null;
                const prev = nodes[i - 1];
                const fromPos = getNodePosition(prev);
                const toPos = getNodePosition(node);

                return (
                  <motion.line
                    key={`line-${i}`}
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    className="nexus-large-connection"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5 }}
                  />
                );
              })}

              {/* Additional connections */}
              {nodes.length >= 6 && (
                <>
                  <motion.line
                    x1={getNodePosition(nodes[1]).x}
                    y1={getNodePosition(nodes[1]).y}
                    x2={getNodePosition(nodes[3]).x}
                    y2={getNodePosition(nodes[3]).y}
                    className="nexus-large-connection"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                  />
                  <motion.line
                    x1={getNodePosition(nodes[2]).x}
                    y1={getNodePosition(nodes[2]).y}
                    x2={getNodePosition(nodes[4]).x}
                    y2={getNodePosition(nodes[4]).y}
                    className="nexus-large-connection"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                  />
                </>
              )}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => (
              <motion.div
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  x: `${node.x}%`,
                  y: `${node.y}%`,
                }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                }}
                className="absolute"
                style={{
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="nexus-large-node" />
                <div className="text-[11px] font-bold uppercase tracking-wider text-white/60 mt-3 text-center whitespace-nowrap">
                  {node.label}
                </div>
              </motion.div>
            ))}

            {/* Phase 3: Suggestion Cards */}
            <AnimatePresence>
              {phase === "suggestions" && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 z-20"
                >
                  <div className="nexus-suggestion-card-3d min-w-[320px]">
                    <div className="text-base font-bold text-white mb-2">
                      {suggestions[currentSuggestion].title}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/50 mb-3">
                      <span className="nexus-badge nexus-badge-success">
                        {suggestions[currentSuggestion].risk} Risk
                      </span>
                      <span>{suggestions[currentSuggestion].files} Files</span>
                    </div>
                    <button className="nexus-btn nexus-btn-primary w-full mt-2">
                      Implement
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Phase 4: Implementation Panel */}
            <AnimatePresence>
              {phase === "implementation" && (
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="absolute left-8 top-1/2 transform -translate-y-1/2 z-20"
                >
                  <div className="nexus-implementation-panel">
                    <div className="nexus-implementation-header">
                      Auto-Building Feature
                    </div>
                    {implementationSteps.map((step, i) => (
                      <div
                        key={i}
                        className={`nexus-implementation-step ${
                          i <= implementationStep ? "active" : ""
                        }`}
                      >
                        {i < implementationStep && (
                          <CheckCircle2 className="w-4 h-4 text-[#00D084]" />
                        )}
                        {i === implementationStep && (
                          <div className="nexus-node-dot" />
                        )}
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Performance Badge */}
            <AnimatePresence>
              {showPerformance && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute bottom-8 right-8 z-20"
                >
                  <div className="nexus-performance-badge">
                    <CheckCircle2 className="w-4 h-4" />
                    +12% Performance Improvement
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
