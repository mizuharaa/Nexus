# Nexus

AI-native developer tool that analyzes GitHub repositories, visualizes feature topology, suggests expansions, simulates strategic futures, and auto-builds features using Claude Code.

## Architecture

- **Frontend**: Next.js + React Flow + TailwindCSS (`frontend/`)
- **Backend**: FastAPI + Pydantic v2 (`backend/`)
- **Database**: Supabase (Postgres)
- **LLM**: OpenAI API (GPT-4o) for analysis / suggestions / simulation
- **Execution**: Claude Code CLI (headless) for autonomous implementation

## Setup

### 1. Database

Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env        # fill in your keys
uvicorn app.main:app --reload "--reload-exclude=**/sandboxes/**"
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/repos/analyze` | Start repo analysis |
| GET | `/api/repos/{id}` | Get repo status |
| GET | `/api/repos/{id}/features` | Get feature graph |
| GET | `/api/features/{id}/suggestions` | Get node suggestions |
| POST | `/api/repos/{id}/simulate` | Generate strategic branches |
| GET | `/api/repos/{id}/branches` | Get branches |
| POST | `/api/features/{id}/build` | Trigger auto-build |
| GET | `/api/execution/{id}` | Execution status |
| GET | `/api/execution/{id}/logs` | Execution logs |
| GET | `/api/health` | Health check |
