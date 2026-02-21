import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Zap,
  Star,
  CreditCard
} from "lucide-react";

interface Dot {
  id: number;
  x: number;
  y: number;
  feature: string;
  icon: React.ReactNode;
}

interface Suggestion {
  title: string;
  description: string;
  impact: string;
  icon: React.ReactNode;
}

const dots: Dot[] = [
  { id: 1, x: 15, y: 20, feature: "Product Catalog", icon: <ShoppingCart className="w-4 h-4" /> },
  { id: 2, x: 35, y: 35, feature: "Checkout Flow", icon: <CreditCard className="w-4 h-4" /> },
  { id: 3, x: 60, y: 25, feature: "User Reviews", icon: <Star className="w-4 h-4" /> },
  { id: 4, x: 75, y: 45, feature: "Search", icon: <Sparkles className="w-4 h-4" /> },
  { id: 5, x: 50, y: 60, feature: "Analytics", icon: <TrendingUp className="w-4 h-4" /> },
  { id: 6, x: 25, y: 70, feature: "Payments", icon: <Zap className="w-4 h-4" /> },
];

const suggestions: Suggestion[] = [
  {
    title: "Add abandoned cart recovery",
    description: "Implement email reminders for users who leave items in cart",
    impact: "+15% conversion",
    icon: <ShoppingCart className="w-5 h-5 text-purple-400" />,
  },
  {
    title: "Optimize product search",
    description: "Add AI-powered search with autocomplete and filters",
    impact: "+30% engagement",
    icon: <Sparkles className="w-5 h-5 text-pink-400" />,
  },
  {
    title: "Implement one-click checkout",
    description: "Save payment details for faster repeat purchases",
    impact: "+25% repeat sales",
    icon: <CreditCard className="w-5 h-5 text-purple-400" />,
  },
  {
    title: "Add social proof badges",
    description: "Show review counts and ratings prominently on product cards",
    impact: "+20% trust score",
    icon: <Star className="w-5 h-5 text-pink-400" />,
  },
];

export default function EcommerceScatterDemo() {
  const [activeDot, setActiveDot] = useState<number | null>(null);
  const [currentSuggestion, setCurrentSuggestion] = useState(0);
  const [connections, setConnections] = useState<[number, number][]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      playAnimation();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const playAnimation = () => {
    setIsPlaying(true);
    setConnections([]);
    setActiveDot(null);
    setCurrentSuggestion(0);

    // Animate connections
    setTimeout(() => setConnections([[1, 2]]), 500);
    setTimeout(() => setConnections([[1, 2], [2, 3]]), 1000);
    setTimeout(() => setConnections([[1, 2], [2, 3], [3, 4]]), 1500);
    setTimeout(() => setConnections([[1, 2], [2, 3], [3, 4], [4, 5]]), 2000);
    setTimeout(() => setConnections([[1, 2], [2, 3], [3, 4], [4, 5], [5, 6]]), 2500);

    // Show suggestions in sequence
    setTimeout(() => {
      setActiveDot(2);
      setCurrentSuggestion(0);
    }, 3000);

    setTimeout(() => {
      setActiveDot(4);
      setCurrentSuggestion(1);
    }, 5500);

    setTimeout(() => {
      setActiveDot(2);
      setCurrentSuggestion(2);
    }, 8000);

    setTimeout(() => {
      setActiveDot(3);
      setCurrentSuggestion(3);
    }, 10500);

    // Reset and loop
    setTimeout(() => {
      setIsPlaying(false);
      setTimeout(() => playAnimation(), 2000);
    }, 13000);
  };

  const getDotPosition = (dot: Dot) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;
    return {
      x: (dot.x / 100) * width,
      y: (dot.y / 100) * height,
    };
  };

  const getConnectionPath = (from: Dot, to: Dot) => {
    const fromPos = getDotPosition(from);
    const toPos = getDotPosition(to);
    return `M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`;
  };

  return (
    <div className="nexus-glass-strong p-8 md:p-12 relative overflow-hidden min-h-[600px]">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
            AI Ecommerce Analyzer
          </h3>
          <p className="text-base text-white/60">
            Watch as Nexus analyzes your store and suggests improvements
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 relative z-10">
        {/* Left side - Scatter plot visualization */}
        <div className="lg:col-span-3">
          <div 
            ref={containerRef}
            className="relative w-full h-[400px] nexus-glass rounded-2xl overflow-hidden"
          >
            {/* SVG for connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              {connections.map(([fromId, toId], index) => {
                const from = dots.find(d => d.id === fromId);
                const to = dots.find(d => d.id === toId);
                if (!from || !to) return null;
                return (
                  <motion.path
                    key={`${fromId}-${toId}`}
                    d={getConnectionPath(from, to)}
                    stroke="url(#lineGradient)"
                    strokeWidth="2"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                );
              })}
            </svg>

            {/* Dots */}
            {dots.map((dot) => {
              const pos = getDotPosition(dot);
              return (
                <motion.div
                  key={dot.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: dot.id * 0.1, type: "spring", stiffness: 200 }}
                  className="absolute"
                  style={{
                    left: `${dot.x}%`,
                    top: `${dot.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <motion.div
                    className={`nexus-dot ${activeDot === dot.id ? 'active' : ''}`}
                    animate={{
                      scale: activeDot === dot.id ? [1, 1.3, 1.2] : 1,
                    }}
                    transition={{
                      repeat: activeDot === dot.id ? Infinity : 0,
                      duration: 1.5,
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      {dot.icon}
                    </div>
                  </motion.div>

                  {/* Label */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: dot.id * 0.1 + 0.2 }}
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap"
                  >
                    <span className="text-xs font-medium text-white/70 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm">
                      {dot.feature}
                    </span>
                  </motion.div>
                </motion.div>
              );
            })}

            {/* Animated background particles */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        </div>

        {/* Right side - AI Suggestions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="nexus-status-indicator bg-gradient-to-r from-purple-500 to-pink-500" />
            <span className="text-sm font-medium text-white/70">
              {isPlaying ? "Analyzing..." : "Ready"}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {activeDot !== null && (
              <motion.div
                key={currentSuggestion}
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="nexus-suggestion-card"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                    {suggestions[currentSuggestion]?.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-white mb-2">
                      {suggestions[currentSuggestion]?.title}
                    </h4>
                    <p className="text-sm text-white/70 mb-3 leading-relaxed">
                      {suggestions[currentSuggestion]?.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="nexus-pill nexus-status-success text-xs">
                        {suggestions[currentSuggestion]?.impact}
                      </span>
                      <span className="text-xs text-white/50">
                        2 files • Low risk
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {activeDot === null && (
            <div className="nexus-glass p-6 rounded-2xl text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-400 opacity-50" />
              <p className="text-sm text-white/50">
                Waiting for analysis to start...
              </p>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="nexus-glass p-4 rounded-xl">
              <div className="text-2xl font-bold text-white mb-1">
                {dots.length}
              </div>
              <div className="text-xs text-white/60">
                Features analyzed
              </div>
            </div>
            <div className="nexus-glass p-4 rounded-xl">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
                {suggestions.length}
              </div>
              <div className="text-xs text-white/60">
                AI suggestions
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom info bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-8 flex items-center justify-between text-sm text-white/50 relative z-10"
      >
        <div className="flex items-center gap-3">
          <span>Complexity: Medium</span>
          <span>•</span>
          <span>Impact: High</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          <span>Auto-implementation ready</span>
        </div>
      </motion.div>
    </div>
  );
}
