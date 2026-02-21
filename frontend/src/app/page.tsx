"use client";

import { useState, useEffect } from "react";
import { InteractiveDotGrid } from "@/components/background/InteractiveDotGrid";
import { RepoInput } from "@/components/modals/RepoInput";
import { FeatureGraphView } from "@/components/graph/FeatureGraphView";
import { SuggestionPanel } from "@/components/panels/SuggestionPanel";
import { AddFeatureFlow } from "@/components/modals/AddFeatureFlow";
import { PlanPanel } from "@/components/panels/PlanPanel";
import { Network, ListChecks, Plus } from "lucide-react";
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
    <div className="flex h-screen w-screen overflow-hidden relative">
      <InteractiveDotGrid />
      {/* Side tab nav */}
      <nav className="flex flex-col w-14 shrink-0 border-r border-border bg-card/50 backdrop-blur-sm py-3 gap-1">
        {isReady && (
          <>
            <button
              onClick={() => setActiveTab("graph")}
              className={`flex flex-col items-center gap-0.5 py-2 px-2 rounded-r-md transition-colors ${
                activeTab === "graph"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              title="Graph"
            >
              <Network className="size-5" />
              <span className="text-[10px] font-medium">Graph</span>
            </button>
            <button
              onClick={() => setActiveTab("plan")}
              className={`flex flex-col items-center gap-0.5 py-2 px-2 rounded-r-md transition-colors ${
                activeTab === "plan"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              title="Plan"
            >
              <ListChecks className="size-5" />
              <span className="text-[10px] font-medium">Plan</span>
            </button>
            {activeTab === "graph" && (
              <button
                onClick={() => setShowAddFeature(true)}
                className="flex flex-col items-center gap-0.5 py-2 px-2 rounded-r-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors mt-2"
                title="Add feature"
              >
                <Plus className="size-5" />
                <span className="text-[10px] font-medium">Add</span>
              </button>
            )}
          </>
        )}
      </nav>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden min-w-0">
        {!repo ? (
          <div className="flex min-h-0 w-full flex-1">
            <RepoInput onRepoCreated={setRepo} />
          </div>
        ) : !isReady ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Analyzing repository...</p>
            </div>
          </div>
        ) : activeTab === "graph" ? (
          <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden flex-row">
            <main className="flex-1 min-w-0 relative overflow-hidden">
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
              <aside className="w-96 shrink-0 border-l border-border overflow-y-auto scrollbar-dark">
                <SuggestionPanel
                  nodeId={selectedNodeId}
                  suggestions={suggestions}
                  loading={loadingSuggestions}
                  onClose={() => setShowSuggestions(false)}
                />
              </aside>
            )}
          </div>
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
