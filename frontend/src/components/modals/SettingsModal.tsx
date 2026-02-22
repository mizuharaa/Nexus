"use client";

import { useState, useEffect } from "react";
import { getSuggestionCriteria, saveSuggestionCriteria } from "@/services/api";

interface SettingsModalProps {
  repoId: string;
  onClose: () => void;
  onSaved?: (criteria: Record<string, string>) => void;
}

export function SettingsModal({ repoId, onClose, onSaved }: SettingsModalProps) {
  const [criteria, setCriteria] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSuggestionCriteria(repoId).then(setCriteria).catch(() => setCriteria({}));
  }, [repoId]);

  const handleChange = (key: string, value: string) => {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await saveSuggestionCriteria(repoId, criteria);
      onSaved?.(criteria);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const criteriaList = [
    { key: "criterion1", label: "Criterion 1", placeholder: "e.g. must be fast" },
    { key: "criterion2", label: "Criterion 2", placeholder: "e.g. must be testable" },
    { key: "criterion3", label: "Criterion 3", placeholder: "e.g. minimal dependencies" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Suggestion Criteria</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            &times;
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Criteria are applied when generating suggestions for graph nodes. Saving will clear all
          existing suggestions; new ones will be generated with these criteria when you click a node.
        </p>

        <div className="space-y-3 mb-6">
          {criteriaList.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {label}
              </label>
              <input
                type="text"
                value={criteria[key] ?? ""}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
