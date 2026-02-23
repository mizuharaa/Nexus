"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  getPlanConversation,
  sendPlanMessage,
  startNewPlan,
  getSuggestions,
  buildFeature,
  type PlanMessage,
} from "@/services/api";
import type { FeatureSuggestion } from "@/types";
import { ExecutionModal } from "@/components/modals/ExecutionModal";

interface PlanPanelProps {
  repoId: string;
}

interface RelatedFeature {
  id: string;
  name: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Related feature card with inline suggestion flow
// ---------------------------------------------------------------------------

function FeatureBuildCard({ feature }: { feature: RelatedFeature }) {
  const [expanded, setExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<FeatureSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [building, setBuilding] = useState<string | null>(null);
  const [executionRunId, setExecutionRunId] = useState<string | null>(null);

  async function handleExpand() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (suggestions.length > 0) return;
    setLoadingSuggestions(true);
    try {
      const s = await getSuggestions(feature.id);
      setSuggestions(s);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleBuild(s: FeatureSuggestion) {
    setBuilding(s.id);
    try {
      const run = await buildFeature(feature.id, s.id);
      setExecutionRunId(run.id);
    } catch {
      // ignore
    } finally {
      setBuilding(null);
    }
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <button
          onClick={handleExpand}
          className="w-full text-left px-3 py-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium leading-snug">{feature.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {expanded ? "▲" : "Auto Build"}
            </span>
          </div>
          {feature.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
              {feature.description}
            </p>
          )}
        </button>

        {expanded && (
          <div className="border-t border-border px-3 py-2 space-y-2">
            {loadingSuggestions ? (
              <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                Loading suggestions…
              </div>
            ) : suggestions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No suggestions available.</p>
            ) : (
              suggestions.map((s) => (
                <div key={s.id} className="rounded border border-border/60 bg-muted/20 p-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-medium leading-snug">{s.name}</span>
                    <span className={`shrink-0 text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
                      s.complexity === "low" ? "bg-emerald-500/10 text-emerald-400"
                      : s.complexity === "medium" ? "bg-amber-500/10 text-amber-400"
                      : "bg-red-500/10 text-red-400"
                    }`}>{s.complexity}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{s.rationale}</p>
                  <button
                    onClick={() => handleBuild(s)}
                    disabled={building === s.id}
                    className="w-full rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    {building === s.id ? "Starting…" : "Auto Build"}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {executionRunId && (
        <ExecutionModal runId={executionRunId} onClose={() => setExecutionRunId(null)} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// PlanPanel
// ---------------------------------------------------------------------------

export function PlanPanel({ repoId }: PlanPanelProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PlanMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [startingNew, setStartingNew] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Collect all related features from latest assistant message
  const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const relatedFeatures: RelatedFeature[] = latestAssistant?.related_features ?? [];
  const suggestedGoals: string[] = latestAssistant?.suggested_goals ?? [];

  useEffect(() => {
    async function load() {
      try {
        const data = await getPlanConversation(repoId);
        setConversationId(data.conversation_id);
        setMessages(data.messages);
      } catch {
        // ignore
      } finally {
        setLoadingConversation(false);
      }
    }
    load();
  }, [repoId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || sending) return;

    setInput("");
    // Optimistic user message
    const tempUserMsg: PlanMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversationId ?? "",
      role: "user",
      content: msg,
      suggested_goals: [],
      related_feature_ids: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);

    try {
      const assistantMsg = await sendPlanMessage(repoId, msg);
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setSending(false);
    }
  }, [repoId, input, sending, conversationId]);

  const handleNewPlan = useCallback(async () => {
    setStartingNew(true);
    try {
      const data = await startNewPlan(repoId);
      setConversationId(data.conversation_id);
      setMessages([]);
    } catch {
      // ignore
    } finally {
      setStartingNew(false);
    }
  }, [repoId]);

  if (loadingConversation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: chat */}
      <div className="flex flex-col flex-1 border-r border-border min-w-0">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3 shrink-0">
          <h2 className="text-sm font-semibold">Plan</h2>
          <button
            onClick={handleNewPlan}
            disabled={startingNew}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {startingNew ? "Starting…" : "New plan"}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && !sending && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-12">
              <p className="text-sm text-muted-foreground">What do you want to build?</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["What should I prioritize?", "How can I improve security?", "What's missing from my auth flow?"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-foreground border border-border"
              }`}>
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-xl bg-muted/50 border border-border px-4 py-3 text-sm text-muted-foreground">
                <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                Thinking…
              </div>
            </div>
          )}

          {/* Suggested goals */}
          {suggestedGoals.length > 0 && !sending && (
            <div className="flex flex-wrap gap-2 pt-1">
              {suggestedGoals.map((goal) => (
                <button
                  key={goal}
                  onClick={() => setInput(goal)}
                  className="rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
                >
                  {goal}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border px-5 py-4 shrink-0">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Describe what you want to plan or build… (Enter to send)"
              rows={2}
              disabled={sending}
              className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Right: related features */}
      <div className="w-80 shrink-0 flex flex-col overflow-hidden">
        <div className="border-b border-border px-4 py-3 shrink-0">
          <h3 className="text-sm font-semibold">Related Features</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {relatedFeatures.length > 0
              ? "From your latest message — click to Auto Build"
              : "Will appear as you chat"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {relatedFeatures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-xs text-muted-foreground">
                Start chatting to surface relevant features from your graph.
              </p>
            </div>
          ) : (
            relatedFeatures.map((f) => (
              <FeatureBuildCard key={f.id} feature={f} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
