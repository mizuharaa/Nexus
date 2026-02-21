import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "motion/react";

export default function MorphingObject() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const rotateX = useTransform(scrollYProgress, [0, 1], [10, 30]);
  const rotateY = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1.1, 0.8]);

  return (
    <div ref={containerRef} className="nexus-morph-container my-32" style={{ position: 'relative' }}>
      {/* Background Glow */}
      <div
        className="nexus-glow-purple"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      />

      <motion.div
        className="nexus-morph-object nexus-gloss"
        style={{
          rotateX,
          rotateY,
          scale,
        }}
      >
        <div className="nexus-morph-face nexus-morph-face-1" />
        <div className="nexus-morph-face nexus-morph-face-2" />
        <div className="nexus-morph-face nexus-morph-face-3" />
        <div className="nexus-morph-face nexus-morph-face-4" />
        <div className="nexus-morph-face nexus-morph-face-5" />
        <div className="nexus-morph-face nexus-morph-face-6" />
      </motion.div>
    </div>
  );
}