"use client";

import { useState } from "react";
import { suggestPlacement, createSuggestion, buildFeature } from "@/services/api";
import { ExecutionModal } from "./ExecutionModal";

type Step =
  | { type: "input" }
  | { type: "loading-placement" }
  | { type: "placement"; candidates: Candidate[] }
  | { type: "loading-suggestion"; candidateNodeId: string; candidateName: string }
  | { type: "confirm"; suggestion: CreatedSuggestion; parentNodeId: string }
  | { type: "building"; runId: string };

interface Candidate {
  node_id: string;
  node_name: string;
  rationale: string;
}

interface CreatedSuggestion {
  id: string;
  name: string;
  rationale: string;
  complexity: string;
}

interface AddFeatureFlowProps {
  repoId: string;
  onClose: () => void;
}

const COMPLEXITY_STYLES: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400",
  medium: "bg-amber-500/10 text-amber-400",
  high: "bg-red-500/10 text-red-400",
};

export function AddFeatureFlow({ repoId, onClose }: AddFeatureFlowProps) {
  const [step, setStep] = useState<Step>({ type: "input" });
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleDescriptionSubmit() {
    if (!description.trim()) return;
    setError(null);
    setStep({ type: "loading-placement" });
    try {
      const result = await suggestPlacement(repoId, description.trim());
      setStep({ type: "placement", candidates: result.candidates });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find placement");
      setStep({ type: "input" });
    }
  }

  async function handleSelectParent(candidate: Candidate) {
    setError(null);
    setStep({ type: "loading-suggestion", candidateNodeId: candidate.node_id, candidateName: candidate.node_name });
    try {
      const suggestion = await createSuggestion(repoId, candidate.node_id, description.trim());
      setStep({ type: "confirm", suggestion, parentNodeId: candidate.node_id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create suggestion");
      setStep({ type: "placement", candidates: (step as { type: "loading-suggestion"; candidateNodeId: string; candidateName: string }).candidateNodeId ? [] : [] });
    }
  }

  async function handleBuild(suggestion: CreatedSuggestion, parentNodeId: string) {
    setError(null);
    try {
      const run = await buildFeature(parentNodeId, suggestion.id);
      setStep({ type: "building", runId: run.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start build");
    }
  }

  if (step.type === "building") {
    return (
      <ExecutionModal
        runId={step.runId}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold">Add a Feature</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {step.type === "input" && "Describe what you want to build"}
              {step.type === "loading-placement" && "Finding best placement…"}
              {step.type === "placement" && "Choose where to place it"}
              {(step.type === "loading-suggestion") && `Generating spec under "${step.candidateName}"…`}
              {step.type === "confirm" && "Review and build"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Step: input */}
          {step.type === "input" && (
            <div className="space-y-4">
              <textarea
                autoFocus
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleDescriptionSubmit();
                  }
                }}
                placeholder="e.g. Add rate limiting to the API, Implement email notifications, Add OAuth login…"
                rows={4}
                className="w-full rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleDescriptionSubmit}
                disabled={!description.trim()}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                Find placement →
              </button>
            </div>
          )}

          {/* Step: loading placement */}
          {step.type === "loading-placement" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Analysing graph structure…</p>
            </div>
          )}

          {/* Step: placement candidates */}
          {step.type === "placement" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground mb-4">
                Placing: <span className="text-foreground font-medium">"{description}"</span>
              </p>
              {step.candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No suitable parent nodes found.</p>
              ) : (
                step.candidates.map((c) => (
                  <button
                    key={c.node_id}
                    onClick={() => handleSelectParent(c)}
                    className="w-full text-left rounded-lg border border-border bg-card p-4 hover:border-primary/60 hover:bg-primary/5 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{c.node_name}</span>
                      <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Place here →
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{c.rationale}</p>
                  </button>
                ))
              )}
              <button
                onClick={() => setStep({ type: "input" })}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
              >
                ← Change description
              </button>
            </div>
          )}

          {/* Step: loading suggestion */}
          {step.type === "loading-suggestion" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Generating implementation spec…</p>
            </div>
          )}

          {/* Step: confirm */}
          {step.type === "confirm" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold">{step.suggestion.name}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${COMPLEXITY_STYLES[step.suggestion.complexity] ?? "bg-zinc-500/10 text-zinc-400"}`}>
                    {step.suggestion.complexity}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.suggestion.rationale}</p>
              </div>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              <button
                onClick={() => handleBuild(step.suggestion, step.parentNodeId)}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Auto Build
              </button>
              <button
                onClick={() => setStep({ type: "input" })}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
              >
                ← Start over
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
