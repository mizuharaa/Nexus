import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "motion/react";
import { 
  GitBranch, 
  Zap, 
  CheckCircle2, 
  FileCode,
  Play,
  Terminal,
  Database,
  Lock
} from "lucide-react";

interface CodeLine {
  id: number;
  text: string;
  delay: number;
}

export default function InteractiveGraphDemo() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showCoding, setShowCoding] = useState(false);
  const [typedLines, setTypedLines] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleNodes, setVisibleNodes] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });

  const codeLines: CodeLine[] = [
    { id: 1, text: "// AI Agent implementing feature", delay: 0 },
    { id: 2, text: "export function authenticateUser(token: string) {", delay: 100 },
    { id: 3, text: "  const decoded = jwt.verify(token, SECRET);", delay: 200 },
    { id: 4, text: "  if (!decoded) throw new Error('Invalid');", delay: 300 },
    { id: 5, text: "  return await User.findById(decoded.id);", delay: 400 },
    { id: 6, text: "}", delay: 500 },
    { id: 7, text: "// Tests generated • Security validated", delay: 600 },
  ];

  useEffect(() => {
    if (isInView && !isPlaying) {
      playDemo();
    }
  }, [isInView]);

  const playDemo = () => {
    setIsPlaying(true);
    setActiveNode(null);
    setShowSuggestion(false);
    setShowCoding(false);
    setTypedLines([]);
    setVisibleNodes([]);

    // Animate nodes popping in
    setTimeout(() => setVisibleNodes(["core"]), 300);
    setTimeout(() => setVisibleNodes(["core", "api"]), 600);
    setTimeout(() => setVisibleNodes(["core", "api", "database"]), 900);
    setTimeout(() => setVisibleNodes(["core", "api", "database", "auth"]), 1200);

    // Click on Auth node
    setTimeout(() => setActiveNode("auth"), 1800);
    
    // Show AI suggestion
    setTimeout(() => setShowSuggestion(true), 2500);
    
    // Start coding animation
    setTimeout(() => {
      setShowCoding(true);
      setShowSuggestion(false);
    }, 4000);

    // Type out code lines
    codeLines.forEach((line, index) => {
      setTimeout(() => {
        setTypedLines(prev => [...prev, line.id]);
      }, 4500 + line.delay);
    });

    // Complete
    setTimeout(() => {
      setActiveNode("complete");
      setVisibleNodes(["core", "api", "database", "auth", "tests"]);
    }, 5800);

    // Reset for replay
    setTimeout(() => {
      setIsPlaying(false);
    }, 7000);
  };

  const handleNodeClick = () => {
    if (!isPlaying) {
      playDemo();
    }
  };

  return (
    <div ref={ref} className="nexus-glass-strong p-8 md:p-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/5 via-transparent to-[#00ff88]/5 pointer-events-none" />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <h3 className="text-xl md:text-2xl font-bold text-white">
          Live Feature Build Demo
        </h3>
        <button
          onClick={playDemo}
          className="nexus-btn-ghost text-sm flex items-center gap-2"
          disabled={isPlaying}
        >
          <Play className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} />
          {isPlaying ? 'Playing' : 'Replay'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 relative z-10">
        {/* Left side - Interactive Graph */}
        <div className="space-y-6">
          <p className="text-base md:text-lg text-white/70 mb-6">
            Click any node to trigger AI suggestions
          </p>

          {/* Graph Structure */}
          <div className="relative">
            {/* Core Node - Center */}
            <div className="flex justify-center mb-6">
              <AnimatePresence>
                {visibleNodes.includes("core") && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="nexus-graph-node"
                  >
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-[#00d4ff]" />
                      <span className="text-base font-semibold text-white">Core API</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Second Level - API & Database */}
            <div className="flex justify-center gap-12 mb-6">
              <AnimatePresence>
                {visibleNodes.includes("api") && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0, x: -30 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="nexus-graph-node"
                  >
                    <div className="flex items-center gap-2">
                      <FileCode className="w-5 h-5 text-[#00ff88]" />
                      <span className="text-base font-semibold text-white">API Layer</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {visibleNodes.includes("database") && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0, x: 30 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="nexus-graph-node"
                  >
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-[#ffb800]" />
                      <span className="text-base font-semibold text-white">Database</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Third Level - Auth (Interactive) */}
            <div className="flex justify-center gap-12">
              <AnimatePresence>
                {visibleNodes.includes("auth") && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    onClick={handleNodeClick}
                    className={`nexus-graph-node cursor-pointer transition-all duration-300 ${
                      activeNode === "auth" ? "border-[#00d4ff] shadow-lg shadow-[#00d4ff]/50" : ""
                    } ${
                      activeNode === "complete" ? "border-[#00ff88] shadow-lg shadow-[#00ff88]/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {activeNode === "complete" ? (
                        <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />
                      ) : (
                        <Lock className="w-5 h-5 text-[#ff3366]" />
                      )}
                      <span className="text-base font-semibold text-white">
                        Add Auth
                        {activeNode === "complete" && (
                          <span className="ml-2 text-sm text-[#00ff88]">✓</span>
                        )}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {visibleNodes.includes("tests") && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                    className="nexus-graph-node border-[#00ff88] shadow-lg shadow-[#00ff88]/30"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />
                      <span className="text-base font-semibold text-white">Tests</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Connection lines */}
            <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: -1 }}>
              {visibleNodes.includes("core") && visibleNodes.includes("api") && (
                <motion.line
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.3 }}
                  transition={{ duration: 0.5 }}
                  x1="50%" y1="15%" x2="35%" y2="45%"
                  stroke="#00d4ff"
                  strokeWidth="2"
                />
              )}
              {visibleNodes.includes("core") && visibleNodes.includes("database") && (
                <motion.line
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.3 }}
                  transition={{ duration: 0.5 }}
                  x1="50%" y1="15%" x2="65%" y2="45%"
                  stroke="#00d4ff"
                  strokeWidth="2"
                />
              )}
            </svg>

            {/* Suggestion tooltip */}
            <AnimatePresence>
              {showSuggestion && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="mt-6 nexus-glass p-5 border-[#00d4ff] border"
                >
                  <div className="mb-3">
                    <p className="text-base font-bold text-white mb-2">
                      AI Suggestion
                    </p>
                    <p className="text-sm text-white/70">
                      Implement JWT authentication with token refresh
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/50">
                    <span>3 files</span>
                    <span>•</span>
                    <span className="text-[#00ff88]">Low risk</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right side - Code Output */}
        <div className="relative min-h-[300px]">
          {!showCoding ? (
            <div className="h-full flex items-center justify-center text-white/50 text-base">
              <div className="text-center">
                <Terminal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Waiting for agent</p>
              </div>
            </div>
          ) : (
            <div className="nexus-terminal h-full">
              {codeLines.map((line) => (
                <AnimatePresence key={line.id}>
                  {typedLines.includes(line.id) && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mb-1.5 font-mono text-sm"
                    >
                      {line.text}
                    </motion.div>
                  )}
                </AnimatePresence>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 flex items-center justify-between text-sm text-white/60 relative z-10"
      >
        <div className="flex items-center gap-2">
          <div
            className={`nexus-status-indicator ${
              activeNode === "complete" ? "bg-[#00ff88]" : "bg-[#00d4ff]"
            }`}
          />
          <span>
            {activeNode === "complete"
              ? "Feature implemented"
              : isPlaying
              ? "Agent working"
              : "Ready to build"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>Complexity: Medium</span>
          <span>Time: 2 min</span>
        </div>
      </motion.div>
    </div>
  );
}
