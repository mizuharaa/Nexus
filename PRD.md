# Product Evolution Engine — PRD

**Hackathon v1** | LLM-First + Claude Code Autonomous Execution

## Product Definition

**Product Evolution Engine** is an AI-native developer tool that:

1. Analyzes a GitHub repository
2. Reconstructs it into a tree-like **feature graph**
3. Suggests related feature expansions when a node is clicked
4. Simulates **three global future development branches** with tradeoffs
5. **Automatically implements** selected features in a sandbox using Claude Code
6. Opens a deploy-ready **pull request** without manual prompting

**Target user:** Solo indie developer.

**Core identity:** Feature topology visualizer + strategic simulator + autonomous feature builder

---

## Scope Constraints

- Single GitHub repo
- Max 100k LOC
- Full re-ingest per analysis
- No AST parsing — **LLM-only structural reasoning**
- Filesystem sandbox only
- Fully autonomous Claude Code execution (headless)
- Optional live log streaming

---

## System Architecture

### Frontend
- **React** + **React Flow** (feature graph)
- Side panel (suggestions + branch view)
- Execution status modal

### Backend
- API server
- Worker process (analysis + execution)
- **Postgres** for persistence
- **GitHub API** integration
- **Claude Code CLI** integration (local)

### LLM Provider
- Hosted model for analysis + suggestions + branches
- **Claude Code CLI** for autonomous implementation

---

## Core Functional Modules

### Module A — Repository Analysis

| Step | Action |
|------|--------|
| 1 | Clone repo into working directory (reject if LOC > 100k) |
| 2 | **Generate Repository Digest**: file tree, framework, key files, deps, package.json scripts |
| 3 | **File Summaries**: LLM summarizes relevant files |
| 4 | **Feature Inference**: LLM generates feature nodes (unlimited) |

**Feature node schema:**
- `name`, `short description`, `anchor files`, `parent_feature`, `related_features`
- UI: collapse subtrees by default, expand/collapse, tree-primary with optional secondary relations

### Module B — Feature Node Interaction

On node click:
- 3–8 related feature expansions
- Risk hotspots for that feature

**Each suggestion includes:**
- Name, why it fits, estimated complexity, impacted files, suggested tests, implementation sketch

### Module C — Strategic Future Simulation

User clicks **"Simulate Futures"** → exactly **3 branches**:

| Branch Philosophy | Example |
|-------------------|---------|
| Expansion-focused | New features, growth |
| Stability/refactor-focused | Refactoring, tests, optimization |
| Strategic pivot | Market repositioning |

**Each branch JSON:**
- `branch_name`, `theme`, `initiatives` (3–6), `architecture_impact`, `scalability_impact`, `risk_impact`, `tradeoffs`, `recommended_execution_order`
- Plus readable narrative explanation

### Module D — Autonomous Feature Implementation

User clicks **"Auto Build"**:

1. **Create sandbox**: `/sandboxes/{repo}/{run_id}`
2. Clone repo, create branch
3. Generate `Plan.md`
4. Generate tests (tests-first)
5. Invoke **Claude Code (headless)** with plan, test files, scope boundaries, file change limit, prohibited dirs
6. **Verification loop**: `npm test`, `npm run lint`, `npm run typecheck` — on failure, fix prompt, reinvoke (max 2 iterations)
7. **Success**: commit, push, open PR via GitHub API
8. PR includes: plan summary, test results, files changed, LLM self-review

**Claude Code constraints:**
- Max 25 files changed
- Cannot modify: `.env`, deployment configs, CI configs
- Stay within feature scope, no deleting unrelated files

### Optional — Live Log Streaming

Stream stdout/stderr from Claude Code, tests, git ops. UI: collapsible terminal panel.

---

## Risk Engine

- Each feature node: risk score 0–100 (file size, test presence, dependency age, LLM reasoning)
- Badge colors: Green / Yellow / Red
- Influences branch reasoning and suggestion prioritization

---

## Data Model (Postgres)

`users`, `repos`, `analysis_runs`, `feature_nodes`, `feature_edges`, `feature_risks`, `feature_suggestions`, `strategic_branches`, `execution_runs`, `execution_logs`

No raw source code stored.

---

## Demo Success Criteria

1. Repo → graph generated
2. Click feature → related suggestions appear
3. Click "Auto Build Wishlist"
4. Claude Code runs
5. Tests pass
6. PR opens automatically

**That moment sells the entire system.**
