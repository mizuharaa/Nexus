import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

const steps = [
  "Creating sandbox...",
  "Generating tests...",
  "Implementing feature...",
  "Running lint...",
  "Fix iteration 1...",
  "PR opened successfully.",
];

export default function TerminalPreview() {
  const [activeStep, setActiveStep] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= steps.length - 1) {
          setTimeout(() => setActiveStep(0), 2000);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => {
      clearInterval(interval);
      clearInterval(cursorInterval);
    };
  }, []);

  return (
    <div className="nexus-terminal w-full h-full min-h-[300px]">
      <div className="space-y-2">
        {steps.map((step, index) => (
          <AnimatePresence key={index}>
            {index <= activeStep && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className={`nexus-terminal-line ${
                  index === steps.length - 1 && index === activeStep
                    ? "success"
                    : index <= activeStep
                    ? "processing"
                    : ""
                }`}
              >
                <span>{step}</span>
                {index === activeStep && index !== steps.length - 1 && showCursor && (
                  <span className="nexus-terminal-cursor" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>
    </div>
  );
}
