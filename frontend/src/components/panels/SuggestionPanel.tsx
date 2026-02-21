"use client";

import { useState } from "react";
import { buildFeature } from "@/services/api";
import type { FeatureSuggestion } from "@/types";
import { ExecutionModal } from "@/components/modals/ExecutionModal";

interface SuggestionPanelProps {
  nodeId: string;
  suggestions: FeatureSuggestion[];
  onClose: () => void;
}

const COMPLEXITY_STYLES: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400",
  medium: "bg-amber-500/10 text-amber-400",
  high: "bg-red-500/10 text-red-400",
};

export function SuggestionPanel({
  nodeId,
  suggestions,
  onClose,
}: SuggestionPanelProps) {
  const [executionRunId, setExecutionRunId] = useState<string | null>(null);
  const [building, setBuilding] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);

  const handleBuild = async (suggestion: FeatureSuggestion) => {
    setBuilding(suggestion.id);
    setBuildError(null);
    try {
      const run = await buildFeature(nodeId, suggestion.id);
      setExecutionRunId(run.id);
    } catch (err) {
      setBuildError(
        err instanceof Error ? err.message : "Failed to start build"
      );
    } finally {
      setBuilding(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Feature Suggestions</h2>
          <p className="text-[11px] text-muted-foreground">
            {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          &times;
        </button>
      </div>

      {/* Error banner */}
      {buildError && (
        <div className="mx-4 mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-red-400">
          {buildError}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Generating suggestions...
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              This may take a few seconds
            </p>
          </div>
        ) : (
          suggestions.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-border bg-card p-4 space-y-2.5 transition-colors hover:border-border/80"
            >
              {/* Name + complexity badge */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium leading-snug">{s.name}</h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    COMPLEXITY_STYLES[s.complexity] ??
                    "bg-zinc-500/10 text-zinc-400"
                  }`}
                >
                  {s.complexity}
                </span>
              </div>

              {/* Rationale */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {s.rationale}
              </p>

              {/* Impacted files */}
              {s.impacted_files.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {s.impacted_files.map((f) => (
                    <span
                      key={f}
                      className="inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}

              {/* Test cases */}
              {s.test_cases.length > 0 && (
                <details className="text-xs text-muted-foreground group">
                  <summary className="cursor-pointer hover:text-foreground transition-colors">
                    Test cases ({s.test_cases.length})
                  </summary>
                  <ul className="mt-1.5 ml-4 list-disc space-y-0.5">
                    {s.test_cases.map((tc, i) => (
                      <li key={i}>{tc}</li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Implementation sketch */}
              {s.implementation_sketch && (
                <details className="text-xs text-muted-foreground group">
                  <summary className="cursor-pointer hover:text-foreground transition-colors">
                    Implementation sketch
                  </summary>
                  <p className="mt-1.5 rounded bg-muted p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                    {s.implementation_sketch}
                  </p>
                </details>
              )}

              {/* Auto Build button */}
              <button
                onClick={() => handleBuild(s)}
                disabled={building === s.id}
                className="mt-1 w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {building === s.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border border-primary-foreground border-t-transparent" />
                    Starting build...
                  </span>
                ) : (
                  "Auto Build"
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Execution modal */}
      {executionRunId && (
        <ExecutionModal
          runId={executionRunId}
          onClose={() => setExecutionRunId(null)}
        />
      )}
    </div>
  );
}
