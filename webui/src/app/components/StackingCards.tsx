import React from "react";
import { useTheme } from "./ThemeProvider";

const cards = [
  {
    num: "01",
    title: "Scan",
    badge: "Discovery",
    lines: [
      "Clone your repo and parse every file, import, and dependency edge.",
      "Build a full knowledge graph of your codebase in seconds.",
    ],
    accent: "#8b5cf6",
    glow: "rgba(139, 92, 246, 0.07)",
    border: "rgba(139, 92, 246, 0.14)",
  },
  {
    num: "02",
    title: "Plan",
    badge: "Strategy",
    lines: [
      "AI maps risk zones, tech debt hotspots, and architectural weak points.",
      "Generates a prioritized action plan ranked by impact and urgency.",
    ],
    accent: "#6366f1",
    glow: "rgba(99, 102, 241, 0.07)",
    border: "rgba(99, 102, 241, 0.14)",
  },
  {
    num: "03",
    title: "Fix",
    badge: "Execution",
    lines: [
      "Autonomous agents write, refactor, and patch code across your stack.",
      "Every change is sandboxed and validated before it touches production.",
    ],
    accent: "#22d3ee",
    glow: "rgba(34, 211, 238, 0.06)",
    border: "rgba(34, 211, 238, 0.12)",
  },
  {
    num: "04",
    title: "Verify",
    badge: "Assurance",
    lines: [
      "Runs tests, lints, and security scans against every generated diff.",
      "Nothing ships without passing your existing CI/CD pipeline gates.",
    ],
    accent: "#34d399",
    glow: "rgba(52, 211, 153, 0.06)",
    border: "rgba(52, 211, 153, 0.12)",
  },
  {
    num: "05",
    title: "Ship",
    badge: "Delivery",
    lines: [
      "Opens clean pull requests with full context, reasoning, and audit trail.",
      "One-click merge — your codebase evolves while you focus on what matters.",
    ],
    accent: "#f472b6",
    glow: "rgba(244, 114, 182, 0.06)",
    border: "rgba(244, 114, 182, 0.12)",
  },
];

export default function StackingCards() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

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
        {cards.map((card, i) => (
          <article
            key={card.num}
            className="stackCard"
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

            <span className="stackCard__badge">{card.badge}</span>

            <h3 className="stackCard__title">{card.title}</h3>
            <p className="stackCard__body">{card.lines[0]}</p>
            <p className="stackCard__body">{card.lines[1]}</p>
          </article>
        ))}

        {/* Spacer gives the last card scroll room so sticky engages */}
        <div style={{ height: "50vh" }} aria-hidden="true" />
      </div>
    </section>
  );
}
