# Nexus — Architecture & PRD Mapping

## Frontend → PRD Module Mapping

| PRD Module | Frontend Location | Status |
|------------|-------------------|--------|
| **Module A — Repo Analysis** | `Onboarding.tsx` | UI ready (mock flow) |
| **Module B — Feature Node Interaction** | `FeatureGraph.tsx` + side panel | UI ready (static mock data) |
| **Module C — Strategic Futures** | `Futures.tsx` | UI ready (static mock branches) |
| **Module D — Auto Build** | `AutoBuildModal.tsx` | UI ready (simulated execution) |
| **Overview / Metrics** | `Overview.tsx` | UI ready (static metrics + terminal log) |
| **Landing** | `LandingPage.tsx` | UI ready |

---

## Key Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | LandingPage | Hero, value prop, Connect Repo CTA |
| `/onboarding` | Onboarding | GitHub connect → Select repo → Start analysis (3 steps) |
| `/dashboard` | Overview | Metrics bar, feature timeline, activity feed, execution log |
| `/dashboard/graph` | FeatureGraph | React Flow graph + side panel (suggestions, risk, files, tests) |
| `/dashboard/futures` | Futures | 3 strategic branches (Expansion, Stability, Pivot) with compare view |

---

## Key Components

| Component | Role |
|-----------|------|
| `InteractiveNodeGraph` | Landing hero — animated commit/security analysis demo |
| `AutoBuildModal` | Execution status with stepper + live logs (simulated) |
| `Sidebar` | Dashboard nav (Overview, Feature Graph, Futures) |
| `FeatureGraph` | React Flow + custom nodes, Simulate Futures → Futures page, Auto Build → modal |

---

## Tech Stack (PRD-Aligned)

- **React** + **Vite** ✓
- **React Flow** (`@xyflow/react`) for feature graph ✓
- **React Router 7** ✓
- **Motion** (Framer Motion) for animations ✓
- **Tailwind CSS** + custom Nexus design system ✓
- **Radix UI** primitives ✓

---

## Backend (To Build)

Per PRD:

- API server (Node/Python)
- Worker for analysis + execution
- Postgres (users, repos, analysis_runs, feature_nodes, etc.)
- GitHub API integration
- Claude Code CLI integration (local sandbox)

---

## Next Steps for Hackathon

1. **Backend API** — Analysis endpoint (clone → digest → feature inference)
2. **Replace mock data** — Feature graph nodes from API, suggestions from LLM
3. **Simulate Futures** — API to generate 3 branches from current repo state
4. **Auto Build** — Worker that invokes Claude Code, streams logs, opens PR
5. **Live log streaming** — WebSocket or SSE for execution logs (optional)

---

## Design System

- **nexus.css** — Core tokens, panels, buttons, terminal, metrics
- **hero-cinematic.css**, **premium-cinematic.css**, **prototype-premium.css** — Hero layouts, graph container, build panel
- **theme.css** — Light/dark theme support
- `nexus-gradient-bg`, `nexus-glass`, `nexus-btn-primary`, `nexus-terminal`, etc.
