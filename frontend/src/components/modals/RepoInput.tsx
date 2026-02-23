"use client";

import { useState, useEffect } from "react";
import { analyzeRepo, getStoredApiKey, setStoredApiKey } from "@/services/api";
import type { Repo } from "@/types";

interface RepoInputProps {
  onRepoCreated: (repo: Repo) => void;
}

export function RepoInput({ onRepoCreated }: RepoInputProps) {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setApiKey(getStoredApiKey());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    if (!apiKey.trim()) {
      setError("Please enter your OpenAI API key.");
      return;
    }

    // Persist the key
    setStoredApiKey(apiKey.trim());

    setLoading(true);
    setError(null);
    try {
      const repo = await analyzeRepo(url.trim());
      onRepoCreated(repo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze repo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 min-h-0 w-full items-center justify-center p-8">
      <div className="mx-auto w-full max-w-lg space-y-8">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Analyze a Repository
          </h2>
          <p className="mt-2 text-muted-foreground">
            Paste a GitHub URL to generate a feature topology graph, explore
            expansion suggestions, and auto-build features with Nexus.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">
              GitHub Repository URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !url.trim() || !apiKey.trim()}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Starting Analysis..." : "Analyze Repository"}
          </button>
        </form>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

      </div>
    </div>
  );
}
