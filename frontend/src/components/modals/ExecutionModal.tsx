"use client";

import { useEffect, useRef, useState } from "react";
import { getExecutionStatus, getExecutionLogs } from "@/services/api";
import type { ExecutionRun, ExecutionLog, ExecutionStatus } from "@/types";

interface ExecutionModalProps {
  runId: string;
  onClose: () => void;
}

const STEPS: { key: ExecutionStatus; label: string }[] = [
  { key: "queued", label: "Queued" },
  { key: "cloning", label: "Cloning repo" },
  { key: "planning", label: "Generating plan" },
  { key: "testing", label: "Writing tests" },
  { key: "building", label: "Claude Code building" },
  { key: "verifying", label: "Verifying" },
  { key: "pushing", label: "Pushing & opening PR" },
  { key: "done", label: "Complete" },
];

function getStepIndex(status: ExecutionStatus): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

export function ExecutionModal({ runId, onClose }: ExecutionModalProps) {
  const [run, setRun] = useState<ExecutionRun | null>(null);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      while (active) {
        try {
          const [status, newLogs] = await Promise.all([
            getExecutionStatus(runId),
            getExecutionLogs(runId),
          ]);
          if (!active) break;
          setRun(status);
          setLogs(newLogs);
          if (status.status === "done" || status.status === "failed") break;
        } catch {
          // retry silently
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    poll();
    return () => {
      active = false;
    };
  }, [runId]);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const currentStep = run ? getStepIndex(run.status) : 0;
  const isFailed = run?.status === "failed";
  const isDone = run?.status === "done";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">
              {isDone
                ? "Build Complete"
                : isFailed
                  ? "Build Failed"
                  : "Building Feature..."}
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
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-1">
            {STEPS.map((step, i) => {
              const isActive = i === currentStep && !isFailed && !isDone;
              const isCompleted = i < currentStep || isDone;
              const isFail = isFailed && i === currentStep;

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
                  {i < STEPS.length - 1 && (
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
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>{STEPS[0].label}</span>
            <span>{STEPS[STEPS.length - 1].label}</span>
          </div>
        </div>

        {/* PR link */}
        {run?.pr_url && (
          <div className="border-b border-border px-6 py-3 bg-emerald-500/5">
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

        {/* Log stream */}
        <div className="max-h-72 overflow-y-auto p-4 font-mono text-xs bg-background/50">
          {logs.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
              Waiting for logs...
            </div>
          ) : (
            logs.map((log) => (
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

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-3">
          <div className="text-xs text-muted-foreground">
            {isDone && "Feature built and PR opened successfully."}
            {isFailed &&
              "Build failed. Check the logs above for details."}
            {!isDone &&
              !isFailed &&
              "This may take a few minutes. You can close and check back."}
          </div>
          <button
            onClick={onClose}
            className="rounded-md bg-muted px-4 py-2 text-xs font-medium hover:bg-muted/80 transition-colors"
          >
            {isDone || isFailed ? "Close" : "Run in background"}
          </button>
        </div>
      </div>
    </div>
  );
}
