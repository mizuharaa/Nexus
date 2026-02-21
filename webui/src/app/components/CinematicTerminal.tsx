import { useState, useEffect } from "react";
import { motion } from "motion/react";

const terminalLines = [
  { text: "Creating sandbox environment...", delay: 0 },
  { text: "Analyzing repository structure", delay: 600 },
  { text: "Generating test suite (12 tests)", delay: 1200 },
  { text: "Implementing feature logic", delay: 1800 },
  { text: "Running lint and format", delay: 2400 },
  { text: "Fix iteration 1/3", delay: 3000 },
  { text: "PR #2841 opened successfully", delay: 3600, success: true },
];

export default function CinematicTerminal() {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [currentTyping, setCurrentTyping] = useState<number | null>(null);

  useEffect(() => {
    const animate = async () => {
      setVisibleLines([]);
      setCurrentTyping(null);

      for (let i = 0; i < terminalLines.length; i++) {
        await delay(terminalLines[i].delay);
        setCurrentTyping(i);
        await delay(Math.random() * 200 + 400); // Variable typing speed
        setVisibleLines(prev => [...prev, i]);
        setCurrentTyping(null);
      }

      await delay(2000);
      animate();
    };

    animate();
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <div className="nexus-terminal-cinematic h-full">
      <div className="nexus-terminal-cinematic-content">
        <div className="nexus-terminal-header">
          SANDBOX / RUN #2841 / MAIN BRANCH
        </div>
        
        <div className="nexus-terminal-body p-4 h-[500px] overflow-y-auto nexus-scroll">
          <div className="space-y-2">
            {terminalLines.map((line, index) => {
              const isVisible = visibleLines.includes(index);
              const isTyping = currentTyping === index;
              
              if (!isVisible && !isTyping) return null;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`nexus-terminal-line ${line.success ? 'success' : ''}`}
                >
                  <span>{line.text}</span>
                  {isTyping && <span className="nexus-terminal-cursor" />}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
