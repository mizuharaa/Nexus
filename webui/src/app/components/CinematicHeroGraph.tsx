import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";

interface Node {
  id: number;
  x: number;
  y: number;
  z: number; // depth
  label: string;
}

interface Suggestion {
  title: string;
  risk: string;
  files: number;
  complexity: string;
}

const nodes: Node[] = [
  { id: 1, x: 20, y: 45, z: 0.9, label: "Auth" },
  { id: 2, x: 35, y: 30, z: 1, label: "Core" },
  { id: 3, x: 50, y: 20, z: 0.95, label: "API" },
  { id: 4, x: 65, y: 35, z: 1, label: "Cache" },
  { id: 5, x: 50, y: 55, z: 0.85, label: "DB" },
  { id: 6, x: 75, y: 50, z: 0.9, label: "Queue" },
];

const connections = [
  { from: 1, to: 2 },
  { from: 2, to: 3 },
  { from: 3, to: 4 },
  { from: 2, to: 5 },
  { from: 4, to: 6 },
];

const suggestions: Record<number, Suggestion> = {
  2: {
    title: "Add Retry Logic",
    risk: "Low Risk",
    files: 3,
    complexity: "Medium",
  },
  3: {
    title: "Implement Caching Layer",
    risk: "Low Risk",
    files: 5,
    complexity: "High",
  },
  4: {
    title: "Refactor Auth Module",
    risk: "Medium Risk",
    files: 8,
    complexity: "High",
  },
};

const branches = [
  { id: 1, label: "EXPANSION", angle: -30, active: false },
  { id: 2, label: "STABILITY", angle: 0, active: true },
  { id: 3, label: "PIVOT", angle: 30, active: false },
];

export default function CinematicHeroGraph() {
  const [activeNodes, setActiveNodes] = useState<number[]>([]);
  const [activeConnections, setActiveConnections] = useState<[number, number][]>([]);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [showBranches, setShowBranches] = useState(false);
  const [rippleNode, setRippleNode] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  
  const graphScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.05]);
  const graphX = useTransform(scrollYProgress, [0.2, 0.4], [0, -10]);

  useEffect(() => {
    const animate = async () => {
      setActiveNodes([]);
      setActiveConnections([]);
      setShowBranches(false);

      // Sequence animation
      for (let i = 0; i < nodes.length; i++) {
        await delay(600);
        setActiveNodes(prev => [...prev, nodes[i].id]);
        
        if (i > 0) {
          const conn = connections.find(c => c.to === nodes[i].id);
          if (conn) {
            setActiveConnections(prev => [...prev, [conn.from, conn.to]]);
          }
        }
      }

      await delay(1200);
      setShowBranches(true);

      await delay(3000);
      animate();
    };

    animate();
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getNodePosition = (node: Node) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (node.x / 100) * rect.width,
      y: (node.y / 100) * rect.height,
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

  const getBranchPath = (nodeId: number, angle: number) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return "";
    
    const pos = getNodePosition(node);
    const length = 100;
    const radians = (angle * Math.PI) / 180;
    const endX = pos.x + Math.cos(radians) * length;
    const endY = pos.y + Math.sin(radians) * length;
    
    return `M ${pos.x} ${pos.y} L ${endX} ${endY}`;
  };

  const handleNodeHover = (nodeId: number) => {
    setHoveredNode(nodeId);
    setRippleNode(nodeId);
    setTimeout(() => setRippleNode(null), 1200);
  };

  const getDepthClass = (z: number) => {
    if (z < 0.9) return "depth-far";
    if (z > 0.95) return "depth-near";
    return "";
  };

  return (
    <div className="relative w-full h-[600px] overflow-hidden">
      {/* Background Layers */}
      <div className="nexus-hero-bg nexus-layer-1">
        <div className="nexus-gradient-wave" />
        <div className="nexus-gradient-streak nexus-gradient-streak-1" />
        <div className="nexus-gradient-streak nexus-gradient-streak-2" />
      </div>
      
      <div className="nexus-hero-grid nexus-layer-2" />

      {/* Graph Canvas */}
      <motion.div
        ref={containerRef}
        style={{ scale: graphScale, x: graphX }}
        className="nexus-graph-canvas nexus-camera-motion nexus-layer-3 absolute inset-0"
      >
        {/* SVG Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7B5CFF" />
              <stop offset="100%" stopColor="#C14CFF" />
            </linearGradient>
          </defs>

          {/* Connection Lines */}
          {connections.map(({ from, to }) => {
            const isActive = activeConnections.some(([f, t]) => f === from && t === to);
            if (!isActive) return null;

            return (
              <motion.path
                key={`${from}-${to}`}
                d={getConnectionPath(from, to)}
                className={`nexus-connection-line ${isActive ? 'active flow' : ''}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            );
          })}

          {/* Branch Lines */}
          <AnimatePresence>
            {showBranches && branches.map((branch) => (
              <motion.g key={branch.id}>
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: branch.id * 0.15 }}
                  d={getBranchPath(6, branch.angle)}
                  className={`nexus-branch-line ${branch.active ? 'active' : ''}`}
                />
                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + branch.id * 0.15 }}
                  x={getNodePosition(nodes[5]).x + Math.cos((branch.angle * Math.PI) / 180) * 70}
                  y={getNodePosition(nodes[5]).y + Math.sin((branch.angle * Math.PI) / 180) * 70}
                  className={`nexus-branch-label ${branch.active ? 'active' : ''}`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {branch.label}
                </motion.text>
              </motion.g>
            ))}
          </AnimatePresence>
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const isActive = activeNodes.includes(node.id);
          if (!isActive) return null;

          const pos = getNodePosition(node);
          const suggestion = suggestions[node.id];
          const isHovered = hoveredNode === node.id;

          return (
            <div key={node.id}>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className={`nexus-constellation-node ${getDepthClass(node.z)}`}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseEnter={() => handleNodeHover(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className="nexus-node-core">
                  <div className="nexus-node-ring" />
                  {rippleNode === node.id && (
                    <div className="nexus-node-ripple" />
                  )}
                </div>
                <div className="nexus-node-label">{node.label}</div>
              </motion.div>

              {/* Suggestion Bubble */}
              <AnimatePresence>
                {isHovered && suggestion && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 5 }}
                    transition={{ duration: 0.2 }}
                    className="nexus-suggestion-bubble"
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      transform: 'translate(20px, -50%)',
                    }}
                  >
                    <div className="nexus-suggestion-title">
                      {suggestion.title}
                    </div>
                    <div className="nexus-suggestion-meta">
                      {suggestion.risk} • {suggestion.files} Files
                    </div>
                    <div className="nexus-suggestion-complexity">
                      Estimated Complexity: {suggestion.complexity}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
