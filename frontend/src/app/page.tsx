"use client";

import { useState, useEffect } from "react";
import { RepoInput } from "@/components/modals/RepoInput";
import { FeatureGraphView } from "@/components/graph/FeatureGraphView";
import { SuggestionPanel } from "@/components/panels/SuggestionPanel";
import { AddFeatureFlow } from "@/components/modals/AddFeatureFlow";
import { PlanPanel } from "@/components/panels/PlanPanel";
import { getRepo } from "@/services/api";
import type { Repo, FeatureSuggestion } from "@/types";

type AppTab = "graph" | "plan";

export default function Home() {
  const [repo, setRepo] = useState<Repo | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>("graph");

  // Poll repo status while analysis is in progress
  useEffect(() => {
    if (!repo || (repo.status !== "pending" && repo.status !== "analyzing")) {
      return;
    }
    const interval = setInterval(async () => {
      try {
        const updated = await getRepo(repo.id);
        setRepo(updated);
        if (updated.status === "ready" || updated.status === "error") {
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [repo?.id, repo?.status]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<FeatureSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAddFeature, setShowAddFeature] = useState(false);

  const isReady = repo?.status === "ready";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">PE</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">
            Product Evolution Engine
          </h1>
        </div>

        {/* Tabs — only shown when repo is ready */}
        {isReady && (
          <div className="flex rounded-lg border border-border p-1 bg-muted/30">
            <button
              onClick={() => setActiveTab("graph")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "graph"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Graph
            </button>
            <button
              onClick={() => setActiveTab("plan")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "plan"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Plan
            </button>
          </div>
        )}

        {isReady && activeTab === "graph" && (
          <button
            onClick={() => setShowAddFeature(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            + Add feature
          </button>
        )}

        {repo && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{repo.name}</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                repo.status === "ready"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : repo.status === "analyzing"
                    ? "bg-amber-500/10 text-amber-400"
                    : repo.status === "error"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-zinc-500/10 text-zinc-400"
              }`}
            >
              {repo.status}
            </span>
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {!repo ? (
          <RepoInput onRepoCreated={setRepo} />
        ) : !isReady ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Analyzing repository...</p>
            </div>
          </div>
        ) : activeTab === "graph" ? (
          <>
            <main className="flex-1 relative">
              <FeatureGraphView
                repoId={repo.id}
                onNodeSelect={(nodeId) => {
                  setSelectedNodeId(nodeId);
                  setShowSuggestions(false);
                }}
                setSuggestions={setSuggestions}
                loadingSuggestions={loadingSuggestions}
                setLoadingSuggestions={setLoadingSuggestions}
                onSuggestionsLoaded={() => setShowSuggestions(true)}
              />
            </main>

            {showSuggestions && selectedNodeId && (
              <aside className="w-96 border-l border-border overflow-y-auto">
                <SuggestionPanel
                  nodeId={selectedNodeId}
                  suggestions={suggestions}
                  loading={loadingSuggestions}
                  onClose={() => setShowSuggestions(false)}
                />
              </aside>
            )}
          </>
        ) : (
          <PlanPanel repoId={repo.id} />
        )}
      </div>

      {showAddFeature && repo && (
        <AddFeatureFlow
          repoId={repo.id}
          onClose={() => setShowAddFeature(false)}
        />
      )}
    </div>
  );
}
