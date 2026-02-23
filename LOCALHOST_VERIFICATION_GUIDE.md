# Localhost Verification Guide — Product Evolution Engine

This guide walks you through running the full pipeline locally and what to check at each stage.

---

## Prerequisites Checklist

| Requirement | How to verify |
|-------------|---------------|
| **Node.js** (v18+) | `node -v` |
| **Python 3.10+** | `python --version` |
| **Supabase project** | Create at [supabase.com](https://supabase.com) |
| **OpenAI API key** | From [platform.openai.com](https://platform.openai.com) |
| **GitHub PAT** | With `repo` scope for cloning/pushing |
| **Claude Code CLI** | For Auto Build: `claude --version` (optional, for execution) |

---

## 1. Database Setup

1. Supabase Dashboard → SQL Editor → New Query
2. Run the contents of `supabase/migrations/001_initial_schema.sql`
3. Confirm tables exist: `repos`, `analysis_runs`, `feature_nodes`, `feature_edges`, `feature_risks`, `feature_suggestions`, `strategic_branches`, `execution_runs`, `execution_logs`

---

## 2. Backend Setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

**Edit `.env`** — must have:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_KEY` | Anon key (optional for some ops) |
| `SUPABASE_SERVICE_KEY` | Service role key (required for DB writes) |
| `OPENAI_API_KEY` | `sk-...` (fallback if user doesn't provide) |
| `OPENAI_MODEL` | `gpt-4o` |
| `GITHUB_TOKEN` | `ghp_...` |

**Start backend:**

```powershell
uvicorn app.main:app --reload "--reload-exclude=**/sandboxes/**"
```

**Verify:** `GET http://localhost:8000/api/health` → `{"status":"ok","service":"product-evolution-engine"}`

---

## 3. Frontend Setup

```powershell
cd frontend
npm install
cp .env.local.example .env.local
```

**Edit `.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Start frontend:**

```powershell
npm run dev
```

**Verify:** Open [http://localhost:3000](http://localhost:3000) — no errors in console.

---

## 4. Pipeline Verification Checklist

### Phase A — Repository Analysis

| Step | Action | Expected |
|------|--------|----------|
| 1 | Enter a GitHub URL (e.g. `https://github.com/vercel/next.js`) | Modal accepts URL |
| 2 | Enter OpenAI API key (or rely on backend `.env`) | Key stored in localStorage |
| 3 | Click "Analyze" | Repo created, status `pending` → `analyzing` |
| 4 | Wait for analysis | Status becomes `ready` |

**Check:** Backend logs show `Analysis completed for repo <id>`.

**Common issues:**
- **LOC > 100k:** Repo rejected with `status: error` — try a smaller repo.
- **Clone fails:** Check `GITHUB_TOKEN` and repo visibility (private/public).
- **LLM errors:** Check `OPENAI_API_KEY` or `X-OpenAI-Key` header.

---

### Phase B — Feature Graph

| Step | Action | Expected |
|------|--------|----------|
| 1 | After analysis completes | Graph loads with nodes and edges |
| 2 | Expand/collapse nodes | Click chevron to toggle children |
| 3 | Bottom bar | Shows feature count and "Simulate Futures" |

**Check:** `GET /api/repos/{repo_id}/features` returns `nodes` and `edges`.

**Common issues:**
- **Empty graph:** "No features detected" — LLM may have returned nothing; check backend logs.
- **Empty edges:** `feature_edges` may be empty if no tree/related edges were inferred.

---

### Phase C — Node Suggestions

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click a feature node | Side panel opens |
| 2 | Wait for suggestions | 3–8 suggestions appear |
| 3 | Each suggestion | Name, rationale, complexity, impacted files |

**Check:** `GET /api/features/{node_id}/suggestions` returns 3–8 items.

**Common issues:**
- **401:** Missing `X-OpenAI-Key` — ensure key is stored and sent in requests.
- **Empty suggestions:** LLM output may be malformed; check backend logs.

---

### Phase D — Strategic Simulation

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click "Simulate Futures" | 3 branches generated |
| 2 | Side panel shows branches | Each has theme, initiatives, tradeoffs |

**Check:** `POST /api/repos/{repo_id}/simulate` returns 3 branches.

**Common issues:**
- **401:** Missing OpenAI key.
- **Malformed JSON:** LLM retries; if still fails, check `simulation_service.py`.

---

### Phase E — Auto Build (Execution)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click "Auto Build" on a suggestion | Execution modal opens |
| 2 | Status updates | `queued` → `cloning` → `planning` → `testing` → `building` → `verifying` → `pushing` → `done` |
| 3 | Success | PR URL shown |

**Check:** `POST /api/features/{node_id}/build` with `{ "suggestion_id": "..." }` returns `execution_run`.

**Prerequisites:**
- **Claude Code CLI** installed: `claude --version`
- **GitHub token** with push permissions
- **Repo:** Must be forkable or you have write access

**Common issues:**
- **"Claude Code CLI not found"** — Install Claude Code CLI.
- **Execution uses server `OPENAI_API_KEY`** — Plan/test generation uses backend env, not user's key.
- **Test path hardcoded:** Uses `__tests__/*.test.ts` — Python repos may fail verification.
- **Verification fails:** `npm test` / `npm run lint` / `npm run typecheck` must exist and pass.

**Watch Claude Code live:** In a separate terminal, run this before clicking Auto Build:

| OS | Command |
|----|---------|
| Linux/Mac | `tail -f backend/sandboxes/claude_live.log` |
| Windows (PowerShell) | `Get-Content backend\sandboxes\claude_live.log -Wait` |

The log file path is also printed in the backend terminal when Claude starts. Output streams there in real-time; the execution modal still shows the full log after completion.

---

## 5. Known / Potential Bugs to Watch

| Issue | Location | Behavior |
|-------|----------|----------|
| **Empty edges query** | `repos.py` | If `nodes_result.data` is empty, `.in_("source_node_id", [])` may behave oddly; typically returns empty edges. |
| **Execution API key** | `execution_service.py` | `execute_build` does not receive `openai_api_key`; `_generate_plan` and `_generate_test_file` use env only. |
| **Test file path** | `execution_service.py` | Hardcodes `__tests__/{slug}.test.ts` — Python repos need `pytest` or `tests/` structure. |
| **Polling** | `ExecutionModal.tsx` | Verify it polls `GET /api/execution/{run_id}` and `GET /api/execution/{run_id}/logs` correctly. |

---

## 6. Quick Test Repo Suggestions

Use small, public repos for faster testing:

- `https://github.com/sindresorhus/is` (tiny)
- `https://github.com/lodash/lodash` (medium, ~50k LOC)
- `https://github.com/vercel/next.js` (large, may hit LOC limit)

---

## 7. API Quick Reference

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

---

## 8. Debugging Tips

1. **Backend logs:** `uvicorn` prints request/response; watch for exceptions.
2. **Browser DevTools:** Network tab for API calls; Console for frontend errors.
3. **Supabase:** Table Editor to inspect `repos`, `analysis_runs`, `feature_nodes`, `execution_runs`.
4. **CORS:** Backend allows `localhost:3000`; if using a different port, add it to `main.py` CORS origins.
