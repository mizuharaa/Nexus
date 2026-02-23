<div align="center">

# NEXUS

### The Product Evolution Engine

**Point at a repo. Watch it think. Ship the feature.**

Nexus is an AI-native developer tool that reverse-engineers your codebase into a living feature graph, simulates strategic futures, and autonomously builds deploy-ready pull requests — without you writing a single prompt.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)
[![Claude](https://img.shields.io/badge/Claude_Code-Autonomous-D97706?style=for-the-badge&logo=anthropic&logoColor=white)](https://anthropic.com)

<br/>

[Getting Started](#-getting-started) · [How It Works](#-how-it-works) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Contributing](#-contributing)

<br/>

</div>

---

## The Problem

You're a solo developer. You have a repo with 40k lines of code. You know it needs work, but you can't see the full picture — which features are fragile, what's worth building next, or how a new feature ripples through your architecture.

You open your editor, stare at the file tree, and think: *"Where do I even start?"*

## What Nexus Does

Nexus doesn't just analyze your code — it **understands your product**.

1. **Sees the shape of your software.** Your entire codebase is reconstructed into an interactive feature graph. Not files. Not folders. *Features.* Click any node to trace dependencies, risk scores, and expansion paths.

2. **Thinks three moves ahead.** Nexus generates three strategic development paths from your current codebase — expansion, stability, and pivot — complete with tradeoffs, architecture impact, and execution order.

3. **Builds while you sleep.** Select a feature suggestion. Nexus spins up a sandboxed environment, writes tests first, implements the code using Claude Code, runs your linter and test suite, and opens a deploy-ready PR with full context.

> **From `git clone` to merged PR — zero manual prompting.**

---

## ✦ How It Works

```
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │    SCAN     │────▶│    PLAN     │────▶│    FIX      │────▶│   VERIFY    │────▶│    SHIP     │
  │             │     │             │     │             │     │             │     │             │
  │  Repo →     │     │  AI builds  │     │  Claude     │     │  Tests,     │     │  PR opens   │
  │  Feature    │     │  remediation│     │  Code runs  │     │  lint,      │     │  with full   │
  │  Graph      │     │  roadmap    │     │  in sandbox │     │  typecheck  │     │  context    │
  └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Scan
Your repository is cloned and analyzed by GPT-4o. Every file is summarized, dependencies are mapped, and features are inferred — not from folder names, but from actual code structure and relationships.

### Plan
Click any node in the graph to get 3–8 feature expansion suggestions with complexity estimates, impacted files, and implementation sketches. Or run the **Future Simulator** to see three strategic paths forward.

### Fix
Claude Code operates headlessly inside a sandboxed clone of your repo. It receives a structured plan, writes tests first, then implements — constrained to max 25 file changes and prohibited from touching `.env`, CI configs, or deployment files.

### Verify
Automated verification runs your test suite, linter, and type checker. If something fails, Nexus generates a fix prompt and re-invokes Claude Code — up to 2 iterations.

### Ship
On success: commit, push, and open a PR via the GitHub API. The PR includes the implementation plan, test results, files changed, and an LLM self-review summary.

---

## ◆ Architecture

```
                    ┌──────────────────────────────────────┐
                    │           Landing Page (Vite)         │
                    │        webui/ — Port 5173             │
                    └──────────────────────────────────────┘

┌──────────────────────────────────────┐    ┌──────────────────────────────────┐
│        Dashboard (Next.js)           │───▶│         Backend (FastAPI)         │
│      frontend/ — Port 3000          │    │       backend/ — Port 8000       │
│                                      │    │                                  │
│  • React Flow feature graph          │    │  • Repository analysis worker    │
│  • Plan conversation panel           │    │  • Feature inference engine      │
│  • Execution modal + live logs       │    │  • Risk scoring pipeline         │
│  • Settings & suggestion criteria    │    │  • Strategic simulation (3 paths)│
│  • Graph version history (undo)      │    │  • Claude Code orchestrator      │
│  • Update graph preview              │    │  • GitHub PR automation          │
└──────────────────────────────────────┘    └────────────────┬─────────────────┘
                                                             │
                                           ┌─────────────────┼─────────────────┐
                                           │                 │                 │
                                    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
                                    │  Supabase   │   │  OpenAI API │   │ Claude Code │
                                    │ (Postgres)  │   │  (GPT-4o)   │   │   (CLI)     │
                                    └─────────────┘   └─────────────┘   └─────────────┘
```

| Layer | Tech | Purpose |
|-------|------|---------|
| **Landing Page** | Vite, React 18, Framer Motion, Tailwind CSS | Marketing site with interactive demos |
| **Dashboard** | Next.js 16, React 19, React Flow | Production app — graph editor, planning, execution |
| **API** | FastAPI, Pydantic v2, Uvicorn | REST API with background workers |
| **Database** | Supabase (PostgreSQL) | Repos, features, edges, risks, executions |
| **Intelligence** | OpenAI GPT-4o | Analysis, suggestions, simulation |
| **Execution** | Claude Code CLI (headless) | Autonomous code implementation |
| **VCS** | PyGithub, GitPython | Repo cloning, branch management, PR creation |

---

## ⚡ Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Supabase](https://supabase.com) project (free tier works)
- [OpenAI API key](https://platform.openai.com)
- [GitHub Personal Access Token](https://github.com/settings/tokens)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (for auto-build)

### 1. Database

Run the migration files in order in the Supabase SQL Editor:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_plan_approval.sql
...through...
supabase/migrations/010_plan_feedback.sql
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Fill in your keys
uvicorn app.main:app --reload "--reload-exclude=**/sandboxes/**"
```

The API starts at `http://localhost:8000`. Check health at `/api/health`.

### 3. Dashboard (Next.js)

```bash
cd frontend
npm install
cp .env.local.example .env.local   # Set NEXT_PUBLIC_API_URL if needed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Landing Page (Vite)

```bash
cd webui
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/repos/analyze` | Analyze a GitHub repository |
| `GET` | `/api/repos/{id}` | Get repository status |
| `GET` | `/api/repos/{id}/features` | Get the feature graph |
| `GET` | `/api/features/{id}/suggestions` | Get feature expansion suggestions |
| `POST` | `/api/repos/{id}/simulate` | Generate 3 strategic future branches |
| `POST` | `/api/features/{id}/build` | Trigger autonomous build |
| `GET` | `/api/execution/{id}` | Get execution status |
| `GET` | `/api/execution/{id}/logs` | Get execution logs |
| `POST` | `/api/repos/{id}/plan/conversation` | Start a plan conversation |
| `POST` | `/api/repos/{id}/update-graph` | Re-analyze and update the graph |
| `GET` | `/api/health` | Health check |

---

## 🛡 Guardrails

Autonomous code generation is volatile. Nexus constrains every execution:

| Guardrail | Limit |
|-----------|-------|
| Max files changed per run | 25 |
| Max fix iterations | 2 |
| Max repo size | 100k LOC |
| Prohibited files | `.env`, CI configs, deployment configs |
| Execution environment | Isolated sandbox (`/sandboxes/{repo}/{run}`) |
| Schema validation | Strict JSON schema on all LLM outputs |
| Runtime cap | 30 minutes per execution |

---

## 🗂 Project Structure

```
Nexus/
├── backend/                 # FastAPI API server
│   ├── app/
│   │   ├── routers/         # API route handlers
│   │   ├── services/        # Business logic (10 services)
│   │   ├── schemas/         # Pydantic models
│   │   ├── workers/         # Background analysis worker
│   │   ├── main.py          # App entry point + CORS
│   │   ├── config.py        # Environment settings
│   │   └── db.py            # Supabase client
│   ├── tests/               # pytest test suite
│   └── requirements.txt
│
├── frontend/                # Next.js dashboard application
│   └── src/
│       ├── app/             # App Router pages
│       ├── components/      # Graph, panels, modals
│       ├── services/        # API client
│       └── types/           # TypeScript interfaces
│
├── webui/                   # Vite landing page / marketing site
│   └── src/
│       ├── app/             # Pages + components
│       └── styles/          # Custom CSS + animations
│
└── supabase/
    └── migrations/          # 10 SQL migration files
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

This project was built for a hackathon. License TBD.

---

<div align="center">

**Built by humans who got tired of building alone.**

</div>
