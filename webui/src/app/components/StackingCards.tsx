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
  },
  {
    num: "02",
    title: "Plan",
    badge: "Strategy",
    lines: [
      "AI maps risk zones, tech debt hotspots, and architectural weak points.",
      "Generates a prioritized action plan ranked by impact and urgency.",
    ],
  },
  {
    num: "03",
    title: "Fix",
    badge: "Execution",
    lines: [
      "Autonomous agents write, refactor, and patch code across your stack.",
      "Every change is sandboxed and validated before it touches production.",
    ],
  },
  {
    num: "04",
    title: "Verify",
    badge: "Assurance",
    lines: [
      "Runs tests, lints, and security scans against every generated diff.",
      "Nothing ships without passing your existing CI/CD pipeline gates.",
    ],
  },
  {
    num: "05",
    title: "Ship",
    badge: "Delivery",
    lines: [
      "Opens clean pull requests with full context, reasoning, and audit trail.",
      "One-click merge — your codebase evolves while you focus on what matters.",
    ],
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
            style={{
              top: `${12 + i * 2}vh`,
              zIndex: i + 1,
            }}
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
      </div>
    </section>
  );
}
