# Nexus - Product Evolution Engine

> Point at a repo. Watch it think. Ship the feature.

AI-native developer tool that reverse-engineers your GitHub repository into a living feature graph, simulates strategic futures, and autonomously builds deploy-ready pull requests using Claude Code — no prompts required.

## Why Nexus?

You're a solo developer with a growing codebase. You know it needs work, but you can't see the full picture:

| The Problem | Nexus Solves It |
|-------------|-----------------|
| "Which features are fragile?" | Risk-scored feature graph with dependency mapping |
| "What should I build next?" | AI-generated expansion suggestions with complexity estimates |
| "How does this change ripple through my architecture?" | Interactive graph with traceable paths |
| "I don't have time to implement" | Autonomous build: sandbox → tests → code → PR |

**Nexus gives you:**

1. **Feature topology** — Your codebase as a living graph, not files and folders. Click any node to see dependencies, risk scores, and expansion paths.

2. **Strategic simulation** — Three future paths (expansion, stability, pivot) with tradeoffs, architecture impact, and execution order.

3. **Autonomous implementation** — Select a suggestion → Claude Code writes tests, implements, runs your pipeline, opens a PR. Max 25 files, 2 fix iterations, no `.env` or CI touches.

## Overview

Nexus enables solo builders to evolve their codebase with:
- **Repository analysis** via GPT-4o — file summaries, dependency mapping, feature inference
- **Interactive feature graph** — React Flow visualization with suggestions and risk badges
- **Future simulator** — Three strategic branches with initiatives and tradeoffs
- **Autonomous execution** — Claude Code CLI in sandbox, tests-first, full verification loop
- **GitHub integration** — Clone, branch, commit, push, open PR via API

## Tech Stack

| Layer | Technology |
|-------|------------|
| Landing Page | Vite, React 18, Framer Motion, Tailwind CSS |
| Dashboard | Next.js 16, React 19, React Flow, TypeScript |
| API | FastAPI, Pydantic v2, Uvicorn |
| Database | Supabase (PostgreSQL) |
| Intelligence | OpenAI GPT-4o |
| Execution | Claude Code CLI (headless) |
| VCS | PyGithub, GitPython |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  React Flow feature graph • Plan panel • Execution modal     │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Supabase    │  │  OpenAI API   │  │ Claude Code   │
│  (Postgres)   │  │   (GPT-4o)    │  │   (CLI)       │
└───────────────┘  └───────────────┘  └───────────────┘
```

### Pipeline (Scan → Plan → Fix → Verify → Ship)

| Phase | Action |
|-------|--------|
| **Scan** | Clone repo → GPT-4o digest → file summaries → feature inference |
| **Plan** | Click node → suggestions; or run Future Simulator → 3 strategic branches |
| **Fix** | Sandbox → Claude Code with plan, tests, scope constraints |
| **Verify** | Run tests, lint, typecheck — fix loop (max 2 iterations) |
| **Ship** | Commit, push, open PR with plan summary and test results |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Supabase](https://supabase.com) project
- [OpenAI API key](https://platform.openai.com)
- [GitHub Personal Access Token](https://github.com/settings/tokens)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (for auto-build)

### Installation

**1. Database**

Run migrations in order in Supabase SQL Editor:
`supabase/migrations/001_initial_schema.sql` through `010_plan_feedback.sql`

**2. Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload "--reload-exclude=**/sandboxes/**"
```

**3. Dashboard**

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**4. Landing Page (optional)**

```bash
cd webui
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Environment Variables

```env
# backend/.env
SUPABASE_URL=your_project.supabase.co
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=sk-your-key
GITHUB_TOKEN=ghp_your-token

# frontend/.env.local (if needed)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/repos/analyze` | Start repo analysis |
| GET | `/api/repos/{id}` | Get repo status |
| GET | `/api/repos/{id}/features` | Get feature graph |
| GET | `/api/features/{id}/suggestions` | Get node suggestions |
| POST | `/api/repos/{id}/simulate` | Generate strategic branches |
| POST | `/api/features/{id}/build` | Trigger auto-build |
| GET | `/api/execution/{id}` | Execution status |
| GET | `/api/execution/{id}/logs` | Execution logs |
| GET | `/api/health` | Health check |

## Project Structure

```
Nexus/
├── backend/                 # FastAPI API server
│   ├── app/routers/         # API route handlers
│   ├── app/services/        # Business logic
│   ├── app/workers/         # Background analysis
│   └── tests/
├── frontend/                # Next.js dashboard
│   └── src/app/             # Pages, components, services
├── webui/                   # Vite landing page
│   └── src/app/             # Marketing site
└── supabase/migrations/     # SQL migrations
```

## Guardrails

| Constraint | Limit |
|------------|-------|
| Max files changed per run | 25 |
| Max fix iterations | 2 |
| Max repo size | 100k LOC |
| Prohibited | `.env`, CI configs, deployment configs |
| Execution | Isolated sandbox per run |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Acknowledgments

- [OpenAI](https://openai.com) - GPT-4o for analysis and suggestions
- [Anthropic](https://anthropic.com) - Claude Code for autonomous implementation
- [Supabase](https://supabase.com) - Database infrastructure
- [Vercel](https://vercel.com) - Next.js and React
