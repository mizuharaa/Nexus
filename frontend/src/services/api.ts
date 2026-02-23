import type {
  Repo,
  FeatureGraph,
  FeatureSuggestion,
  ExecutionRun,
  ExecutionLog,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const OPENAI_KEY_STORAGE = "pee_openai_key";

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(OPENAI_KEY_STORAGE) ?? "";
}

export function setStoredApiKey(key: string): void {
  if (typeof window === "undefined") return;
  if (key) {
    localStorage.setItem(OPENAI_KEY_STORAGE, key);
  } else {
    localStorage.removeItem(OPENAI_KEY_STORAGE);
  }
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = getStoredApiKey();
  if (key) {
    headers["X-OpenAI-Key"] = key;
  }
  return headers;
}

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: buildHeaders(),
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ---- Repos ----

export async function analyzeRepo(githubUrl: string): Promise<Repo> {
  return fetchJSON<Repo>("/api/repos/analyze", {
    method: "POST",
    body: JSON.stringify({ github_url: githubUrl }),
  });
}

export async function getRepo(repoId: string): Promise<Repo> {
  return fetchJSON<Repo>(`/api/repos/${repoId}`);
}

// ---- Features ----

export async function getFeatureGraph(repoId: string): Promise<FeatureGraph> {
  return fetchJSON<FeatureGraph>(`/api/repos/${repoId}/features`);
}

export async function getSuggestions(
  nodeId: string
): Promise<FeatureSuggestion[]> {
  return fetchJSON<FeatureSuggestion[]>(
    `/api/features/${nodeId}/suggestions`
  );
}

export async function updateFeatureNode(
  nodeId: string,
  name: string,
  description: string
): Promise<void> {
  await fetchJSON(`/api/features/${nodeId}`, {
    method: "PATCH",
    body: JSON.stringify({ name, description }),
  });
}

export async function undoGraph(repoId: string): Promise<FeatureGraph> {
  return fetchJSON<FeatureGraph>(`/api/repos/${repoId}/undo`, { method: "POST" });
}

export async function canUndo(repoId: string): Promise<boolean> {
  const res = await fetchJSON<{ can_undo: boolean }>(`/api/repos/${repoId}/undo/available`);
  return res.can_undo;
}

export async function suggestPlacement(
  repoId: string,
  description: string,
  criteria?: Record<string, string>
): Promise<{ candidates: { node_id: string; node_name: string; rationale: string }[] }> {
  return fetchJSON(`/api/repos/${repoId}/suggest-placement`, {
    method: "POST",
    body: JSON.stringify({ description, criteria }),
  });
}

export async function createSuggestion(
  repoId: string,
  parentNodeId: string,
  description: string,
  criteria?: Record<string, string>
): Promise<FeatureSuggestion> {
  return fetchJSON<FeatureSuggestion>(`/api/repos/${repoId}/create-suggestion`, {
    method: "POST",
    body: JSON.stringify({ parent_node_id: parentNodeId, description, criteria }),
  });
}

// ---- Update Graph ----

export async function startUpdateGraph(repoId: string): Promise<{ status: string; message: string }> {
  return fetchJSON(`/api/repos/${repoId}/update-graph`, { method: "POST" });
}

export interface UpdateGraphPending {
  nodes: FeatureGraph["nodes"];
  edges: FeatureGraph["edges"];
  diff: {
    added: { name: string; description: string }[];
    removed: { name: string; description: string; has_execution: boolean }[];
    updated: { name: string; before: Record<string, unknown>; after: Record<string, unknown> }[];
  };
}

export async function getPendingUpdate(repoId: string): Promise<UpdateGraphPending> {
  return fetchJSON(`/api/repos/${repoId}/update-graph/pending`);
}

export async function applyPendingUpdate(repoId: string): Promise<{ status: string }> {
  return fetchJSON(`/api/repos/${repoId}/update-graph/apply`, { method: "POST" });
}

export async function revertPendingUpdate(repoId: string): Promise<{ status: string }> {
  return fetchJSON(`/api/repos/${repoId}/update-graph/revert`, { method: "POST" });
}

// ---- Plan ----

export interface PlanMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  suggested_goals: string[];
  related_feature_ids: string[];
  related_features?: { id: string; name: string; description: string }[];
  created_at: string;
}

export async function getPlanConversation(repoId: string): Promise<{
  conversation_id: string;
  messages: PlanMessage[];
}> {
  return fetchJSON(`/api/repos/${repoId}/plan/conversation`);
}

export async function sendPlanMessage(
  repoId: string,
  message: string
): Promise<PlanMessage> {
  return fetchJSON(`/api/repos/${repoId}/plan/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function startNewPlan(repoId: string): Promise<{ conversation_id: string; messages: PlanMessage[] }> {
  return fetchJSON(`/api/repos/${repoId}/plan/new`, { method: "POST" });
}

// ---- Suggestion Criteria (Settings) ----

export async function getSuggestionCriteria(repoId: string): Promise<Record<string, string>> {
  const res = await fetchJSON<{ criteria: Record<string, string> }>(
    `/api/repos/${repoId}/suggestion-criteria`
  );
  return res.criteria ?? {};
}

export async function saveSuggestionCriteria(
  repoId: string,
  criteria: Record<string, string>
): Promise<{ status: string; message: string }> {
  return fetchJSON(`/api/repos/${repoId}/suggestion-criteria`, {
    method: "POST",
    body: JSON.stringify({ criteria }),
  });
}

// ---- Execution ----

export async function buildFeature(
  nodeId: string,
  suggestionId: string
): Promise<ExecutionRun> {
  return fetchJSON<ExecutionRun>(`/api/features/${nodeId}/build`, {
    method: "POST",
    body: JSON.stringify({ suggestion_id: suggestionId }),
  });
}

export async function approveExecution(
  runId: string
): Promise<ExecutionRun> {
  return fetchJSON<ExecutionRun>(`/api/execution/${runId}/approve`, {
    method: "POST",
  });
}

export async function retryExecution(
  runId: string
): Promise<ExecutionRun> {
  return fetchJSON<ExecutionRun>(`/api/execution/${runId}/retry`, {
    method: "POST",
  });
}

export async function updatePlan(
  runId: string,
  planMd: string
): Promise<ExecutionRun> {
  return fetchJSON<ExecutionRun>(`/api/execution/${runId}/plan`, {
    method: "PUT",
    body: JSON.stringify({ plan_md: planMd }),
  });
}

export async function abandonExecution(
  runId: string
): Promise<ExecutionRun> {
  return fetchJSON<ExecutionRun>(`/api/execution/${runId}/abandon`, {
    method: "POST",
  });
}

export async function markPrMerged(runId: string): Promise<ExecutionRun> {
  return fetchJSON<ExecutionRun>(`/api/execution/${runId}/on-merged`, {
    method: "POST",
  });
}

export async function getExecutionStatus(
  runId: string
): Promise<ExecutionRun> {
  return fetchJSON<ExecutionRun>(`/api/execution/${runId}`);
}

export async function getExecutionLogs(
  runId: string
): Promise<ExecutionLog[]> {
  return fetchJSON<ExecutionLog[]>(`/api/execution/${runId}/logs`);
}

export async function submitPlanFeedback(
  runId: string,
  rating: "positive" | "negative",
  comment?: string
): Promise<ExecutionRun> {
  return fetchJSON<ExecutionRun>(`/api/execution/${runId}/plan-feedback`, {
    method: "POST",
    body: JSON.stringify({ rating, comment: comment ?? null }),
  });
}
