"use client";

import { useState, useEffect } from "react";
import {
  getPendingUpdate,
  applyPendingUpdate,
  revertPendingUpdate,
  type UpdateGraphPending,
} from "@/services/api";

interface UpdateGraphPreviewModalProps {
  repoId: string;
  onApplied: () => void;
  onReverted: () => void;
}

export function UpdateGraphPreviewModal({
  repoId,
  onApplied,
  onReverted,
}: UpdateGraphPreviewModalProps) {
  const [pending, setPending] = useState<UpdateGraphPending | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [reverting, setReverting] = useState(false);

  useEffect(() => {
    getPendingUpdate(repoId)
      .then(setPending)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [repoId]);

  async function handleApply() {
    setApplying(true);
    try {
      await applyPendingUpdate(repoId);
      onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply");
    } finally {
      setApplying(false);
    }
  }

  async function handleRevert() {
    setReverting(true);
    try {
      await revertPendingUpdate(repoId);
      onReverted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revert");
    } finally {
      setReverting(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="rounded-xl border border-border bg-card px-8 py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !pending) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="rounded-xl border border-border bg-card px-8 py-6 max-w-md">
          <p className="text-sm text-red-400">{error ?? "No pending update"}</p>
          <button
            onClick={onReverted}
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { diff } = pending;
  const hasChanges =
    diff.added.length > 0 || diff.removed.length > 0 || diff.updated.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl">
        <div className="shrink-0 border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">Sync Graph Preview</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Review changes before applying. You can revert to keep the current graph.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-dark">
          {!hasChanges && (
            <p className="text-sm text-muted-foreground">
              No structural changes detected. The graph is unchanged.
            </p>
          )}

          {diff.added.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-emerald-400 mb-2">
                + Added ({diff.added.length})
              </h3>
              <ul className="space-y-1.5 text-xs">
                {diff.added.map((a) => (
                  <li key={a.name} className="rounded bg-emerald-500/10 px-3 py-2">
                    <span className="font-medium">{a.name}</span>
                    {a.description && (
                      <p className="mt-0.5 text-muted-foreground whitespace-pre-wrap break-words">
                        {a.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {diff.removed.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-400 mb-2">
                − Removed ({diff.removed.length})
              </h3>
              <ul className="space-y-1.5 text-xs">
                {diff.removed.map((r) => (
                  <li key={r.name} className="rounded bg-red-500/10 px-3 py-2">
                    <span className="font-medium">{r.name}</span>
                    {r.has_execution && (
                      <span className="ml-2 text-amber-400 text-[10px]">
                        (has execution history)
                      </span>
                    )}
                    {r.description && (
                      <p className="mt-0.5 text-muted-foreground whitespace-pre-wrap break-words">
                        {r.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {diff.updated.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-amber-400 mb-2">
                ~ Updated ({diff.updated.length})
              </h3>
              <ul className="space-y-2 text-xs">
                {diff.updated.map((u) => (
                  <li key={u.name} className="rounded bg-amber-500/10 px-3 py-2">
                    <span className="font-medium">{u.name}</span>
                    <div className="mt-1.5 grid grid-cols-2 gap-2 text-muted-foreground">
                      <div>
                        <span className="text-[10px] uppercase">Before</span>
                        <p className="mt-0.5 whitespace-pre-wrap break-words">
                          {(u.before.description as string) ?? ""}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase">After</span>
                        <p className="mt-0.5 whitespace-pre-wrap break-words">
                          {(u.after.description as string) ?? ""}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={handleRevert}
            disabled={reverting}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50"
          >
            {reverting ? "Reverting…" : "Revert"}
          </button>
          <button
            onClick={handleApply}
            disabled={applying}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {applying ? "Applying…" : "Apply Sync"}
          </button>
        </div>
      </div>
    </div>
  );
}
