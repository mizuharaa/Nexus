import { useState, useEffect } from "react";
import { motion } from "motion/react";

const lines = [
  "Creating sandbox...",
  "Generating tests...",
  "Implementing feature...",
  "Running lint...",
  "Fix iteration 1...",
  "PR opened successfully",
];

export default function RealisticTerminal() {
  const [currentLine, setCurrentLine] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLine((prev) => {
        if (prev >= lines.length - 1) {
          setTimeout(() => {
            setCurrentLine(0);
            setCompleted([]);
          }, 2000);
          return prev;
        }
        
        if (prev < lines.length - 1) {
          setCompleted((comp) => [...comp, prev]);
        }
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="nexus-terminal h-full">
      <div className="nexus-terminal-header">
        SANDBOX / RUN #2041 / MAIN BRANCH
      </div>
      <div className="nexus-terminal-body">
        {lines.map((line, index) => {
          if (index > currentLine) return null;
          
          const isComplete = completed.includes(index);
          const isCurrent = index === currentLine && index < lines.length - 1;
          const isSuccess = index === lines.length - 1 && index === currentLine;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0 }}
              className={`nexus-terminal-line ${isSuccess ? 'success' : ''}`}
            >
              <span>{line}</span>
              {isCurrent && <span className="nexus-terminal-cursor" />}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
