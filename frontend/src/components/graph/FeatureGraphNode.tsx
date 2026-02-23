"use client";

import { memo, useState } from "react";
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
  onEdit: (nodeId: string, name: string, description: string) => Promise<void>;
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
  const label = score <= 33 ? "Low" : score <= 66 ? "Medium" : "High";
  return (
    <span
      title={`Risk: ${score} (${label})`}
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
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [descVal, setDescVal] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setNameVal(d.label);
    setDescVal(d.description ?? "");
    setEditing(true);
  }

  function cancelEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(false);
  }

  async function saveEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setSaving(true);
    try {
      await d.onEdit(id, nameVal, descVal);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`min-w-[220px] max-w-[280px] rounded-xl border p-3 shadow-md transition-all duration-150 ${
        d.selected
          ? "border-primary bg-primary/5 shadow-primary/20 ring-1 ring-primary/40"
          : "border-border bg-card hover:shadow-lg hover:shadow-primary/5"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" />

      {editing ? (
        /* ---- Edit mode ---- */
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            className="w-full rounded border border-border bg-muted px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Feature name"
          />
          <textarea
            value={descVal}
            onChange={(e) => setDescVal(e.target.value)}
            rows={3}
            className="w-full rounded border border-border bg-muted px-2 py-1 text-xs text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Description"
          />
          <div className="flex gap-1.5">
            <button
              onClick={saveEdit}
              disabled={saving || !nameVal.trim()}
              className="flex-1 rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="flex-1 rounded border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* ---- View mode ---- */
        <>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold leading-tight">{d.label}</h3>
            <div className="flex items-center gap-1">
              {hovered && (
                <button
                  onClick={startEdit}
                  title="Edit node"
                  className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  ✎
                </button>
              )}
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
        </>
      )}

      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" />
    </div>
  );
});
