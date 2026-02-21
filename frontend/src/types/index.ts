// ---- Repos ----

export interface Repo {
  id: string;
  github_url: string;
  name: string;
  default_branch: string | null;
  loc_count: number | null;
  framework_detected: string | null;
  status: "pending" | "analyzing" | "ready" | "error";
  created_at: string;
}

export interface AnalysisRun {
  id: string;
  repo_id: string;
  status: "running" | "completed" | "failed";
  digest_json: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
}

// ---- Features ----

export interface FeatureNode {
  id: string;
  analysis_run_id: string;
  name: string;
  description: string;
  anchor_files: string[];
  parent_feature_id: string | null;
  risk_score: number | null;
  metadata_json: Record<string, unknown> | null;
}

export interface FeatureEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: "tree" | "related";
}

export interface FeatureGraph {
  nodes: FeatureNode[];
  edges: FeatureEdge[];
}

export interface FeatureSuggestion {
  id: string;
  feature_node_id: string;
  name: string;
  rationale: string;
  complexity: string;
  impacted_files: string[];
  test_cases: string[];
  implementation_sketch: string | null;
}

// ---- Execution ----

export type ExecutionStatus =
  | "queued"
  | "cloning"
  | "planning"
  | "testing"
  | "awaiting_approval"
  | "building"
  | "verifying"
  | "pushing"
  | "done"
  | "failed";

export interface ExecutionRun {
  id: string;
  feature_suggestion_id: string;
  repo_id: string;
  status: ExecutionStatus;
  sandbox_path: string | null;
  branch_name: string | null;
  pr_url: string | null;
  plan_md: string | null;
  iteration_count: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface ExecutionLog {
  id: string;
  execution_run_id: string;
  step: string;
  message: string;
  log_level: "info" | "warn" | "error";
  timestamp: string;
}
