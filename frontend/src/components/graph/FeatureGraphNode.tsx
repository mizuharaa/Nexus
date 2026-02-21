"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

interface FeatureNodeData {
  label: string;
  description: string;
  riskScore: number | null;
  anchorFiles: string[];
  childCount: number;
  collapsed: boolean;
  selected: boolean;
  onToggleCollapse: (nodeId: string) => void;
  [key: string]: unknown;
}

function riskBadge(score: number | null) {
  if (score === null) return null;
  const color =
    score <= 33
      ? "bg-emerald-500/20 text-emerald-400"
      : score <= 66
        ? "bg-amber-500/20 text-amber-400"
        : "bg-red-500/20 text-red-400";
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${color}`}
    >
      {score}
    </span>
  );
}

export const FeatureGraphNode = memo(function FeatureGraphNode({
  id,
  data,
}: NodeProps) {
  const d = data as unknown as FeatureNodeData;

  return (
    <div
      className={`min-w-[220px] max-w-[280px] rounded-xl border p-3 shadow-md transition-all duration-150 ${
        d.selected
          ? "border-primary bg-primary/5 shadow-primary/20 ring-1 ring-primary/40"
          : "border-border bg-card hover:shadow-lg hover:shadow-primary/5"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" />

      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight">{d.label}</h3>
        <div className="flex items-center gap-1">
          {riskBadge(d.riskScore)}
          {d.childCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                d.onToggleCollapse(id);
              }}
              className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={d.collapsed ? "Expand children" : "Collapse children"}
            >
              {d.collapsed ? `+${d.childCount}` : "\u2212"}
            </button>
          )}
        </div>
      </div>

      {d.description && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {d.description}
        </p>
      )}

      {d.anchorFiles?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {d.anchorFiles.slice(0, 3).map((f) => (
            <span
              key={f}
              className="inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
            >
              {f.split("/").pop()}
            </span>
          ))}
          {d.anchorFiles.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{d.anchorFiles.length - 3}
            </span>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" />
    </div>
  );
});
