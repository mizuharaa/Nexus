import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Node {
  id: number;
  x: number;
  y: number;
  label: string;
  connected: boolean;
}

interface Suggestion {
  title: string;
  meta: string;
  impact?: string;
}

const nodes: Node[] = [
  { id: 1, x: 50, y: 20, label: "Core", connected: false },
  { id: 2, x: 25, y: 45, label: "Auth", connected: false },
  { id: 3, x: 75, y: 45, label: "API", connected: false },
  { id: 4, x: 50, y: 70, label: "DB", connected: false },
];

const connections = [
  { from: 1, to: 2 },
  { from: 1, to: 3 },
  { from: 2, to: 4 },
  { from: 3, to: 4 },
];

const suggestions: Record<number, Suggestion> = {
  2: {
    title: "Add Caching Layer",
    meta: "Low Risk • 2 Files",
    impact: "+12% Performance",
  },
  3: {
    title: "Refactor Auth Module",
    meta: "Medium Risk • 5 Files",
  },
  4: {
    title: "Retry Payment Logic",
    meta: "Low Risk • 3 Files",
    impact: "+8% Reliability",
  },
};

export default function HeroGraphAnimation() {
  const [activeNodes, setActiveNodes] = useState<number[]>([]);
  const [activeConnections, setActiveConnections] = useState<[number, number][]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<number | null>(null);
  const [showBranches, setShowBranches] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const animate = async () => {
      // Reset
      setActiveNodes([]);
      setActiveConnections([]);
      setActiveSuggestion(null);
      setShowBranches(false);

      // Node 1 appears
      await delay(500);
      setActiveNodes([1]);

      // Connect to node 2
      await delay(800);
      setActiveConnections([[1, 2]]);
      await delay(400);
      setActiveNodes([1, 2]);
      await delay(600);
      setActiveSuggestion(2);

      // Connect to node 3
      await delay(1200);
      setActiveSuggestion(null);
      setActiveConnections([[1, 2], [1, 3]]);
      await delay(400);
      setActiveNodes([1, 2, 3]);
      await delay(600);
      setActiveSuggestion(3);

      // Connect to node 4
      await delay(1200);
      setActiveSuggestion(null);
      setActiveConnections([[1, 2], [1, 3], [2, 4], [3, 4]]);
      await delay(400);
      setActiveNodes([1, 2, 3, 4]);
      await delay(600);
      setActiveSuggestion(4);

      // Show branches
      await delay(1500);
      setActiveSuggestion(null);
      setShowBranches(true);

      // Loop
      await delay(3000);
      animate();
    };

    animate();
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getNodePosition = (node: Node) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;
    return {
      x: (node.x / 100) * width,
      y: (node.y / 100) * height,
    };
  };

  const getConnectionPath = (fromId: number, toId: number) => {
    const from = nodes.find(n => n.id === fromId);
    const to = nodes.find(n => n.id === toId);
    if (!from || !to) return "";
    
    const fromPos = getNodePosition(from);
    const toPos = getNodePosition(to);
    
    return `M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[500px] nexus-panel-strong"
    >
      {/* SVG for connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7B5CFF" />
            <stop offset="100%" stopColor="#C14CFF" />
          </linearGradient>
        </defs>
        
        {connections.map(({ from, to }) => {
          const isActive = activeConnections.some(
            ([f, t]) => f === from && t === to
          );
          
          return isActive ? (
            <motion.path
              key={`${from}-${to}`}
              d={getConnectionPath(from, to)}
              className="nexus-connection-line active"
              stroke="url(#lineGradient)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
          ) : null;
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((node) => {
        const isActive = activeNodes.includes(node.id);
        const pos = getNodePosition(node);
        const hasSuggestion = activeSuggestion === node.id;
        
        return (
          <div key={node.id}>
            {isActive && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 20 
                }}
                className="absolute nexus-node active"
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="nexus-node-glow" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-500" />
                  <span className="text-sm font-semibold text-white">
                    {node.label}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Suggestion bubble */}
            <AnimatePresence>
              {hasSuggestion && suggestions[node.id] && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="absolute nexus-suggestion"
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y + 15}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="nexus-suggestion-title">
                    {suggestions[node.id].title}
                  </div>
                  <div className="nexus-suggestion-meta">
                    <span>{suggestions[node.id].meta}</span>
                    {suggestions[node.id].impact && (
                      <>
                        <span>•</span>
                        <span className="text-green-400">
                          {suggestions[node.id].impact}
                        </span>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Branch Overlays */}
      <AnimatePresence>
        {showBranches && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-end justify-center gap-4 pb-8 pointer-events-none"
          >
            {["Expansion", "Stability", "Pivot"].map((branch, i) => (
              <motion.div
                key={branch}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="text-xs font-semibold text-white/40 uppercase tracking-wider"
              >
                {branch}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
