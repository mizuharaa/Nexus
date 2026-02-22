import React, { useRef, useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

const cards = [
  {
    num: "01",
    title: "Scan",
    badge: "Discovery",
    desc: "Your entire codebase — mapped in seconds. Every file, import, and dependency edge becomes a node in a living knowledge graph.",
    features: [
      "Deep dependency mapping across all languages and frameworks",
      "Git history analysis to surface hidden risk patterns",
      "Automated codebase health scoring with actionable metrics",
    ],
    accent: "#8b5cf6",
    glow: "rgba(139, 92, 246, 0.08)",
    border: "rgba(139, 92, 246, 0.15)",
  },
  {
    num: "02",
    title: "Plan",
    badge: "Strategy",
    desc: "Before a single line changes, AI builds a ranked remediation roadmap. Every risk zone, every hotspot, every weak point — prioritized.",
    features: [
      "Risk-ranked remediation roadmap by impact and urgency",
      "Three strategic paths compared: expand, stabilize, pivot",
      "Impact analysis and blast radius prediction per change",
    ],
    accent: "#6366f1",
    glow: "rgba(99, 102, 241, 0.08)",
    border: "rgba(99, 102, 241, 0.15)",
  },
  {
    num: "03",
    title: "Fix",
    badge: "Execution",
    desc: "Autonomous agents write production-grade code across your stack. Multi-file refactors, test generation, and patches — all sandboxed.",
    features: [
      "Multi-file refactoring in isolated sandbox environments",
      "Test-first code generation with scope-locked boundaries",
      "Dependency-aware patching that respects your architecture",
    ],
    accent: "#22d3ee",
    glow: "rgba(34, 211, 238, 0.07)",
    border: "rgba(34, 211, 238, 0.13)",
  },
  {
    num: "04",
    title: "Verify",
    badge: "Assurance",
    desc: "Every generated diff runs through your full pipeline. Tests, lints, security scans — nothing touches production without passing your gates.",
    features: [
      "Full CI/CD pipeline integration with existing workflows",
      "Security vulnerability scanning on every generated diff",
      "Automated regression testing with coverage enforcement",
    ],
    accent: "#34d399",
    glow: "rgba(52, 211, 153, 0.07)",
    border: "rgba(52, 211, 153, 0.13)",
  },
  {
    num: "05",
    title: "Ship",
    badge: "Delivery",
    desc: "Clean pull requests with full context, reasoning, and audit trail. Your codebase evolves while you focus on building what matters.",
    features: [
      "Context-rich pull requests with complete reasoning chains",
      "Full audit trail for compliance and team visibility",
      "One-click merge with automatic rollback safety nets",
    ],
    accent: "#f472b6",
    glow: "rgba(244, 114, 182, 0.07)",
    border: "rgba(244, 114, 182, 0.13)",
  },
];

export default function StackingCards() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let topIdx = -1;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = cardRefs.current.indexOf(entry.target as HTMLElement);
            if (idx > topIdx) topIdx = idx;
          }
        });
        if (topIdx >= 0) setActiveIdx(topIdx);
      },
      { threshold: 0.5 }
    );

    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="stackWrap">
      <div
        style={{
          textAlign: "center",
          paddingTop: "4rem",
          paddingBottom: "3rem",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(2.5rem, 6vw, 5rem)",
            fontWeight: 900,
            lineHeight: 0.9,
            letterSpacing: "-0.04em",
            textTransform: "uppercase",
            color: isDark ? "white" : "#1A1A2E",
          }}
        >
          Five Phases.
          <br />
          <span
            style={{
              color: isDark
                ? "rgba(255,255,255,0.25)"
                : "rgba(0,0,0,0.2)",
            }}
          >
            Zero Guesswork.
          </span>
        </h2>
      </div>

      <div className="stackInner">
        {cards.map((card, i) => {
          const isActive = i === activeIdx;
          return (
            <article
              ref={(el) => { cardRefs.current[i] = el; }}
              key={card.num}
              className={`stackCard ${isActive ? "stackCard--active" : ""}`}
              style={
                {
                  top: `${12 + i * 2}vh`,
                  zIndex: i + 1,
                  "--card-accent": card.accent,
                  "--card-glow": card.glow,
                  "--card-border": card.border,
                } as React.CSSProperties
              }
            >
              <span className="stackCard__num" aria-hidden="true">
                {card.num}
              </span>

              {/* Progress indicator */}
              <div className="stackCard__progress">
                <div
                  className="stackCard__progressFill"
                  style={{
                    width: isActive ? "100%" : "0%",
                    background: card.accent,
                  }}
                />
              </div>

              <div className="stackCard__content">
                <div className="stackCard__left">
                  <span className="stackCard__badge">{card.badge}</span>
                  <h3 className="stackCard__title">{card.title}</h3>
                  <p className="stackCard__desc">{card.desc}</p>
                </div>

                <ul className="stackCard__features">
                  {card.features.map((f, fi) => (
                    <li key={fi} className="stackCard__feature">
                      <span
                        className="stackCard__featureDot"
                        style={{ background: card.accent }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}

        <div style={{ height: "50vh" }} aria-hidden="true" />
      </div>
    </section>
  );
}
