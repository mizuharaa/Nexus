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

export async function fixGraph(
  repoId: string,
  message: string
): Promise<{ explanation: string; nodes: FeatureGraph["nodes"]; edges: FeatureGraph["edges"] }> {
  return fetchJSON(`/api/repos/${repoId}/graph/fix`, {
    method: "POST",
    body: JSON.stringify({ message }),
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
