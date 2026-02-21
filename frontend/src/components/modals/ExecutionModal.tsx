"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  getExecutionStatus,
  getExecutionLogs,
  approveExecution,
  retryExecution,
  updatePlan,
  abandonExecution,
  markPrMerged,
} from "@/services/api";
import type { ExecutionRun, ExecutionLog, ExecutionStatus } from "@/types";

interface ExecutionModalProps {
  runId: string;
  onClose: () => void;
}

const PLAN_STEPS: { key: ExecutionStatus; label: string }[] = [
  { key: "queued", label: "Queued" },
  { key: "cloning", label: "Cloning repo" },
  { key: "planning", label: "Generating plan" },
  { key: "testing", label: "Writing tests" },
  { key: "awaiting_approval", label: "Review plan" },
];

const BUILD_STEPS: { key: ExecutionStatus; label: string }[] = [
  { key: "building", label: "Claude Code building" },
  { key: "verifying", label: "Verifying" },
  { key: "pushing", label: "Pushing & opening PR" },
  { key: "done", label: "Complete" },
];

function getPhase(
  status: ExecutionStatus
): "planning" | "approval" | "building" | "failed" | "done" {
  if (status === "done") return "done";
  if (status === "failed") return "failed";
  if (status === "awaiting_approval") return "approval";
  if (
    status === "building" ||
    status === "verifying" ||
    status === "pushing"
  )
    return "building";
  return "planning";
}

function StepIndicator({
  steps,
  currentStatus,
  isFailed,
}: {
  steps: { key: ExecutionStatus; label: string }[];
  currentStatus: ExecutionStatus;
  isFailed: boolean;
}) {
  const currentIdx = steps.findIndex((s) => s.key === currentStatus);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const isActive = i === currentIdx && !isFailed;
        const isCompleted = currentIdx > i || currentStatus === "done";
        const isFail = isFailed && i === currentIdx;

        return (
          <div key={step.key} className="flex items-center gap-1 flex-1">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium transition-colors ${
                isFail
                  ? "bg-red-500/20 text-red-400"
                  : isCompleted
                    ? "bg-emerald-500/20 text-emerald-400"
                    : isActive
                      ? "bg-primary/20 text-primary animate-pulse"
                      : "bg-muted text-muted-foreground"
              }`}
            >
              {isCompleted ? "\u2713" : isFail ? "\u2717" : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 rounded ${
                  isCompleted ? "bg-emerald-500/30" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ExecutionModal({ runId, onClose }: ExecutionModalProps) {
  const [run, setRun] = useState<ExecutionRun | null>(null);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [approving, setApproving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState(false);
  const [editedPlan, setEditedPlan] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [markingMerged, setMarkingMerged] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef(true);

  // Poll for status and logs
  useEffect(() => {
    pollRef.current = true;
    const poll = async () => {
      while (pollRef.current) {
        try {
          const [status, newLogs] = await Promise.all([
            getExecutionStatus(runId),
            getExecutionLogs(runId),
          ]);
          if (!pollRef.current) break;
          setRun(status);
          setLogs(newLogs);
          if (status.status === "done") break;
          // Stop polling on failed — user needs to take action
          if (status.status === "failed") break;
          if (status.status === "awaiting_approval") {
            await new Promise((r) => setTimeout(r, 5000));
            continue;
          }
        } catch {
          // retry silently
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    poll();
    return () => {
      pollRef.current = false;
    };
  }, [runId]);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Restart polling (called after retry/approve triggers a new build)
  const restartPolling = useCallback(() => {
    pollRef.current = true;
    const poll = async () => {
      while (pollRef.current) {
        try {
          const [status, newLogs] = await Promise.all([
            getExecutionStatus(runId),
            getExecutionLogs(runId),
          ]);
          if (!pollRef.current) break;
          setRun(status);
          setLogs(newLogs);
          if (
            status.status === "done" ||
            status.status === "failed"
          )
            break;
          if (status.status === "awaiting_approval") {
            await new Promise((r) => setTimeout(r, 5000));
            continue;
          }
        } catch {
          // retry
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    poll();
  }, [runId]);

  const handleApprove = useCallback(async () => {
    setApproving(true);
    setActionError(null);
    try {
      await approveExecution(runId);
      const updated = await getExecutionStatus(runId);
      setRun(updated);
      restartPolling();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to approve"
      );
    } finally {
      setApproving(false);
    }
  }, [runId, restartPolling]);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    setActionError(null);
    setEditingPlan(false);
    try {
      await retryExecution(runId);
      const updated = await getExecutionStatus(runId);
      setRun(updated);
      restartPolling();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to retry"
      );
    } finally {
      setRetrying(false);
    }
  }, [runId, restartPolling]);

  const handleSavePlanAndRetry = useCallback(async () => {
    setSavingPlan(true);
    setActionError(null);
    try {
      await updatePlan(runId, editedPlan);
      setEditingPlan(false);
      // Now retry with updated plan
      await retryExecution(runId);
      const updated = await getExecutionStatus(runId);
      setRun(updated);
      restartPolling();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update plan"
      );
    } finally {
      setSavingPlan(false);
    }
  }, [runId, editedPlan, restartPolling]);

  const handleAbandon = useCallback(async () => {
    setAbandoning(true);
    setActionError(null);
    try {
      await abandonExecution(runId);
      onClose();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to abandon"
      );
    } finally {
      setAbandoning(false);
    }
  }, [runId, onClose]);

  const handleMarkMerged = useCallback(async () => {
    setMarkingMerged(true);
    setActionError(null);
    try {
      const updated = await markPrMerged(runId);
      setRun(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to mark as merged");
    } finally {
      setMarkingMerged(false);
    }
  }, [runId]);

  const handleStartEditPlan = useCallback(() => {
    setEditingPlan(true);
    setEditedPlan(run?.plan_md ?? "");
  }, [run?.plan_md]);

  const phase = run ? getPhase(run.status) : "planning";
  const isFailed = phase === "failed";
  const isDone = phase === "done";

  // Filter logs
  const claudeLogs = logs.filter((l) => l.step === "claude_code");
  const statusLogs = logs.filter((l) => l.step !== "claude_code");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold">
              {phase === "approval"
                ? "Review Implementation Plan"
                : isDone
                  ? "Build Complete"
                  : isFailed
                    ? "Build Failed"
                    : phase === "building"
                      ? "Building Feature..."
                      : "Generating Plan..."}
            </h2>
            {run && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Run: {run.id.slice(0, 8)}
                {run.iteration_count > 0 &&
                  ` | Iteration ${run.iteration_count}`}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Progress steps */}
        <div className="border-b border-border px-6 py-4 shrink-0">
          {phase === "planning" || phase === "approval" ? (
            <>
              <StepIndicator
                steps={PLAN_STEPS}
                currentStatus={run?.status ?? "queued"}
                isFailed={false}
              />
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>{PLAN_STEPS[0].label}</span>
                <span>{PLAN_STEPS[PLAN_STEPS.length - 1].label}</span>
              </div>
            </>
          ) : (
            <>
              <StepIndicator
                steps={BUILD_STEPS}
                currentStatus={run?.status ?? "building"}
                isFailed={isFailed}
              />
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>{BUILD_STEPS[0].label}</span>
                <span>{BUILD_STEPS[BUILD_STEPS.length - 1].label}</span>
              </div>
            </>
          )}
        </div>

        {/* PR link */}
        {run?.pr_url && (
          <div className="border-b border-border px-6 py-3 bg-emerald-500/5 shrink-0">
            <a
              href={run.pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-emerald-400 hover:underline"
            >
              <span className="font-medium">Pull Request opened</span>
              <span className="text-xs text-muted-foreground truncate">
                {run.pr_url}
              </span>
            </a>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Plan approval view */}
          {phase === "approval" && run?.plan_md && (
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-1">
                  Implementation Plan
                </h3>
                <p className="text-xs text-muted-foreground">
                  Review the plan below. Approve to start building with Claude
                  Code.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-4 max-h-80 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
                  {run.plan_md}
                </pre>
              </div>
              {actionError && (
                <div className="mt-3 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                  {actionError}
                </div>
              )}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {approving ? "Approving..." : "Approve & Build"}
                </button>
                <button
                  onClick={onClose}
                  disabled={approving}
                  className="rounded-md bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Planning phase: show status logs */}
          {phase === "planning" && (
            <div className="p-4 font-mono text-xs bg-background/50">
              {statusLogs.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                  Starting...
                </div>
              ) : (
                statusLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`py-0.5 leading-relaxed ${
                      log.log_level === "error"
                        ? "text-red-400"
                        : log.log_level === "warn"
                          ? "text-amber-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    <span className="text-zinc-600 select-none">
                      [{log.step}]
                    </span>{" "}
                    {log.message}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          )}

          {/* Build phase: show Claude output */}
          {phase === "building" && (
            <div className="p-4 font-mono text-xs bg-background/50">
              {statusLogs
                .filter((l) =>
                  ["build", "verify", "push"].includes(l.step)
                )
                .map((log) => (
                  <div
                    key={log.id}
                    className={`py-0.5 leading-relaxed ${
                      log.log_level === "error"
                        ? "text-red-400"
                        : log.log_level === "warn"
                          ? "text-amber-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    <span className="text-zinc-600 select-none">
                      [{log.step}]
                    </span>{" "}
                    {log.message}
                  </div>
                ))}

              {claudeLogs.length > 0 && (
                <div className="mt-2 border-t border-border/50 pt-2">
                  <div className="text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">
                    Claude Code Output
                  </div>
                  {claudeLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`py-0.5 leading-relaxed ${
                        log.message.startsWith("[Reading]") ||
                        log.message.startsWith("[Writing]") ||
                        log.message.startsWith("[Editing]")
                          ? "text-blue-400"
                          : log.message.startsWith("[Running]")
                            ? "text-amber-400"
                            : log.message.startsWith("  ->")
                              ? "text-zinc-500"
                              : log.message.startsWith("[Result]")
                                ? "text-emerald-400"
                                : log.log_level === "error"
                                  ? "text-red-400"
                                  : log.log_level === "warn"
                                    ? "text-amber-400"
                                    : "text-foreground/80"
                      }`}
                    >
                      {log.message}
                    </div>
                  ))}
                </div>
              )}

              {claudeLogs.length === 0 && (
                <div className="flex items-center gap-2 text-muted-foreground mt-2">
                  <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                  Waiting for Claude Code output...
                </div>
              )}
              <div ref={logEndRef} />
            </div>
          )}

          {/* Done: show logs summary + merge action */}
          {isDone && (
            <div className="p-4 space-y-4">
              <div className="font-mono text-xs bg-background/50">
                {statusLogs
                  .filter((l) =>
                    ["build", "verify", "push", "done"].includes(l.step)
                  )
                  .map((log) => (
                    <div
                      key={log.id}
                      className={`py-0.5 leading-relaxed ${
                        log.log_level === "error"
                          ? "text-red-400"
                          : log.log_level === "warn"
                            ? "text-amber-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      <span className="text-zinc-600 select-none">
                        [{log.step}]
                      </span>{" "}
                      {log.message}
                    </div>
                  ))}
                <div ref={logEndRef} />
              </div>

              {/* Mark as merged */}
              {run?.pr_url && (
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <p className="text-sm font-medium">After merging the PR</p>
                  <p className="text-xs text-muted-foreground">
                    Once you merge the PR on GitHub, mark it here to add the built feature as a node in the graph.
                  </p>
                  {run.pr_merged ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <span>✓</span>
                      <span>Feature added to graph</span>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleMarkMerged}
                        disabled={markingMerged}
                        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                      >
                        {markingMerged ? "Adding to graph…" : "Mark PR as Merged"}
                      </button>
                      {actionError && (
                        <p className="text-xs text-red-400">{actionError}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Failed: show error logs + retry options */}
          {isFailed && (
            <div className="p-4">
              {/* Error logs */}
              <div className="mb-4 font-mono text-xs bg-background/50 rounded-lg border border-red-500/20 p-3 max-h-40 overflow-y-auto">
                {logs
                  .filter(
                    (l) =>
                      l.log_level === "error" || l.log_level === "warn"
                  )
                  .slice(-10)
                  .map((log) => (
                    <div
                      key={log.id}
                      className={`py-0.5 leading-relaxed ${
                        log.log_level === "error"
                          ? "text-red-400"
                          : "text-amber-400"
                      }`}
                    >
                      <span className="text-zinc-600 select-none">
                        [{log.step}]
                      </span>{" "}
                      {log.message}
                    </div>
                  ))}
                {logs.filter(
                  (l) =>
                    l.log_level === "error" || l.log_level === "warn"
                ).length === 0 && (
                  <div className="text-red-400">
                    Build failed. No detailed error logs available.
                  </div>
                )}
              </div>

              {/* Edit plan view */}
              {editingPlan ? (
                <div className="mb-4">
                  <div className="mb-2">
                    <h3 className="text-sm font-semibold">Edit Plan</h3>
                    <p className="text-xs text-muted-foreground">
                      Modify the plan below, then save and retry.
                    </p>
                  </div>
                  <textarea
                    value={editedPlan}
                    onChange={(e) => setEditedPlan(e.target.value)}
                    className="w-full h-64 rounded-lg border border-border bg-background p-3 font-mono text-sm text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={handleSavePlanAndRetry}
                      disabled={savingPlan || !editedPlan.trim()}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                    >
                      {savingPlan ? "Saving & retrying..." : "Save & Retry"}
                    </button>
                    <button
                      onClick={() => setEditingPlan(false)}
                      disabled={savingPlan}
                      className="rounded-md bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Retry action buttons */
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    What would you like to do?
                  </h3>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleRetry}
                      disabled={retrying || abandoning}
                      className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm">
                        R
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {retrying ? "Retrying..." : "Retry as-is"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Re-run Claude Code with the error context from the
                          previous attempt
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={handleStartEditPlan}
                      disabled={retrying || abandoning}
                      className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 text-sm">
                        E
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          Edit plan & retry
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Modify the implementation plan before retrying the
                          build
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={handleAbandon}
                      disabled={retrying || abandoning}
                      className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400 text-sm">
                        X
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {abandoning ? "Cleaning up..." : "Abandon"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Clean up the sandbox and close
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {actionError && (
                <div className="mt-3 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                  {actionError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-3 shrink-0">
          <div className="text-xs text-muted-foreground">
            {isDone && "Feature built and PR opened successfully."}
            {isFailed && "Build failed. Choose an action above."}
            {phase === "approval" && "Review the plan and approve to continue."}
            {phase === "planning" && "Generating implementation plan..."}
            {phase === "building" &&
              "Claude Code is working. You can close and check back."}
          </div>
          {!isFailed && (
            <button
              onClick={onClose}
              className="rounded-md bg-muted px-4 py-2 text-xs font-medium hover:bg-muted/80 transition-colors"
            >
              {isDone ? "Close" : "Run in background"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
