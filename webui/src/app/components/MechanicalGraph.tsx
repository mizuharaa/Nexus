import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Node {
  id: number;
  x: number;
  y: number;
  label: string;
}

interface Tag {
  title: string;
  meta: string;
}

const nodes: Node[] = [
  { id: 1, x: 30, y: 25, label: "Auth" },
  { id: 2, x: 50, y: 15, label: "Core" },
  { id: 3, x: 70, y: 25, label: "API" },
  { id: 4, x: 50, y: 45, label: "DB" },
];

const connections = [
  { from: 1, to: 2 },
  { from: 2, to: 3 },
  { from: 2, to: 4 },
];

const tags: Record<number, Tag> = {
  2: { title: "Add Caching Layer", meta: "LOW RISK • 3 FILES" },
  3: { title: "Refactor Auth Module", meta: "MEDIUM RISK • 5 FILES" },
};

export default function MechanicalGraph() {
  const [activeNodes, setActiveNodes] = useState<number[]>([]);
  const [activeLines, setActiveLines] = useState<[number, number][]>([]);
  const [activeTag, setActiveTag] = useState<number | null>(null);
  const [branches, setBranches] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const animate = async () => {
      setActiveNodes([]);
      setActiveLines([]);
      setActiveTag(null);
      setBranches(false);

      await delay(300);
      setActiveNodes([1]);

      await delay(500);
      setActiveLines([[1, 2]]);
      
      await delay(400);
      setActiveNodes([1, 2]);
      
      await delay(500);
      setActiveTag(2);

      await delay(1200);
      setActiveTag(null);
      setActiveLines([[1, 2], [2, 3]]);
      
      await delay(400);
      setActiveNodes([1, 2, 3]);
      
      await delay(500);
      setActiveTag(3);

      await delay(1200);
      setActiveTag(null);
      setActiveLines([[1, 2], [2, 3], [2, 4]]);
      
      await delay(400);
      setActiveNodes([1, 2, 3, 4]);

      await delay(800);
      setBranches(true);

      await delay(2500);
      animate();
    };

    animate();
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getNodePos = (node: Node) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const w = containerRef.current.offsetWidth;
    const h = containerRef.current.offsetHeight;
    return { x: (node.x / 100) * w, y: (node.y / 100) * h };
  };

  const getPath = (fromId: number, toId: number) => {
    const from = nodes.find(n => n.id === fromId);
    const to = nodes.find(n => n.id === toId);
    if (!from || !to) return "";
    const fromPos = getNodePos(from);
    const toPos = getNodePos(to);
    return `M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`;
  };

  return (
    <div ref={containerRef} className="relative w-full h-[400px] nexus-panel">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {connections.map(({ from, to }) => {
          const isActive = activeLines.some(([f, t]) => f === from && t === to);
          return isActive ? (
            <motion.path
              key={`${from}-${to}`}
              d={getPath(from, to)}
              className={`nexus-line ${isActive ? 'active' : ''}`}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, ease: "linear" }}
            />
          ) : null;
        })}

        {/* Ghost branches */}
        {branches && (
          <>
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              d={getPath(4, 1)}
              className="nexus-line"
            />
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              d={getPath(3, 1)}
              className="nexus-line"
            />
          </>
        )}
      </svg>

      {nodes.map((node) => {
        const isActive = activeNodes.includes(node.id);
        if (!isActive) return null;

        return (
          <motion.div
            key={node.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, ease: "linear" }}
            className="absolute"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className={`nexus-node ${activeTag === node.id ? 'active' : ''}`}>
              <div className="flex items-center gap-2">
                <div className="nexus-node-dot" />
                <span>{node.label}</span>
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Tags */}
      <AnimatePresence>
        {activeTag && tags[activeTag] && (
          <motion.div
            key={activeTag}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="nexus-tag"
            style={{
              left: `${nodes.find(n => n.id === activeTag)!.x}%`,
              top: `${nodes.find(n => n.id === activeTag)!.y + 12}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="nexus-tag-title">{tags[activeTag].title}</div>
            <div className="nexus-tag-meta">{tags[activeTag].meta}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Branch labels */}
      <AnimatePresence>
        {branches && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-4 left-0 right-0 flex justify-center gap-8 text-[10px] uppercase tracking-wider text-white/25 font-semibold"
          >
            <span>EXPANSION</span>
            <span>STABILITY</span>
            <span>PIVOT</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
