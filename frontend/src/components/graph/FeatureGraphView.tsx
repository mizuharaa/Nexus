"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import { getFeatureGraph, getSuggestions, updateFeatureNode, undoGraph, canUndo } from "@/services/api";
import { FeatureGraphNode } from "./FeatureGraphNode";
import type { FeatureNode, FeatureEdge, FeatureSuggestion } from "@/types";

const nodeTypes = { feature: FeatureGraphNode };

const NODE_WIDTH = 280;
const NODE_HEIGHT = 90;
const H_GAP = 80;
const V_GAP = 24;

interface FeatureGraphViewProps {
  repoId: string;
  onNodeSelect: (nodeId: string) => void;
  setSuggestions: (s: FeatureSuggestion[]) => void;
  loadingSuggestions: boolean;
  setLoadingSuggestions: (loading: boolean) => void;
  onSuggestionsLoaded?: () => void;
}

// -----------------------------------------------------------------------
// Tree layout engine
// -----------------------------------------------------------------------

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

function buildLayout(
  features: FeatureNode[],
  featureEdges: FeatureEdge[],
  collapsedSet: Set<string>,
  selectedNodeId: string | null,
  onToggleCollapse: (id: string) => void,
  onEdit: (nodeId: string, name: string, description: string) => Promise<void>
): LayoutResult {
  // Use only tree edges (parent -> child); ignore related/lateral edges
  const treeEdges = featureEdges.filter((e) => e.edge_type === "tree");

  const featureById = new Map<string, FeatureNode>();
  const childMap = new Map<string, FeatureNode[]>();
  for (const f of features) {
    featureById.set(f.id, f);
  }

  // Build child map from parent_feature_id (more reliable than edges)
  for (const f of features) {
    if (f.parent_feature_id) {
      const siblings = childMap.get(f.parent_feature_id) ?? [];
      siblings.push(f);
      childMap.set(f.parent_feature_id, siblings);
    }
  }

  const rootNodes = features.filter((f) => !f.parent_feature_id);

  // Recursive layout: assign positions
  const nodes: Node[] = [];
  let globalY = 0;

  function countVisibleDescendants(featureId: string): number {
    if (collapsedSet.has(featureId)) return 0;
    const children = childMap.get(featureId) ?? [];
    let count = children.length;
    for (const child of children) {
      count += countVisibleDescendants(child.id);
    }
    return count;
  }

  function layoutNode(feature: FeatureNode, depth: number): void {
    const children = childMap.get(feature.id) ?? [];
    const isCollapsed = collapsedSet.has(feature.id);

    nodes.push({
      id: feature.id,
      type: "feature",
      position: { x: depth * (NODE_WIDTH + H_GAP), y: globalY },
      data: {
        label: feature.name,
        description: feature.description,
        riskScore: feature.risk_score,
        anchorFiles: feature.anchor_files,
        childCount: children.length,
        collapsed: isCollapsed,
        selected: feature.id === selectedNodeId,
        onToggleCollapse,
        onEdit,
      },
    });

    globalY += NODE_HEIGHT + V_GAP;

    if (!isCollapsed) {
      for (const child of children) {
        layoutNode(child, depth + 1);
      }
    }
  }

  for (const root of rootNodes) {
    layoutNode(root, 0);
  }

  // Build edges from tree edges only (hide edges to collapsed children)
  const visibleNodeIds = new Set(nodes.map((n) => n.id));

  const edges: Edge[] = treeEdges
    .filter(
      (e) => visibleNodeIds.has(e.source_node_id) && visibleNodeIds.has(e.target_node_id)
    )
    .map((e) => ({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      type: "smoothstep",
      style: { stroke: "#3f3f46", strokeWidth: 1.5 },
    }));

  return { nodes, edges };
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function FeatureGraphView({
  repoId,
  onNodeSelect,
  setSuggestions,
  loadingSuggestions,
  setLoadingSuggestions,
  onSuggestionsLoaded,
}: FeatureGraphViewProps) {
  const [rawFeatures, setRawFeatures] = useState<FeatureNode[]>([]);
  const [rawEdges, setRawEdges] = useState<FeatureEdge[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const handleToggleCollapse = useCallback((nodeId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleEdit = useCallback(
    async (nodeId: string, name: string, description: string) => {
      await updateFeatureNode(nodeId, name, description);
      // Update local features state so graph re-renders immediately
      setRawFeatures((prev) =>
        prev.map((f) => (f.id === nodeId ? { ...f, name, description } : f))
      );
      setUndoAvailable(true);
      // If this node is selected, refresh suggestions
      if (selectedNodeId === nodeId) {
        setSuggestions([]);
        setLoadingSuggestions(true);
        try {
          const suggestions = await getSuggestions(nodeId);
          setSuggestions(suggestions);
        } catch {
          setSuggestions([]);
        } finally {
          setLoadingSuggestions(false);
          onSuggestionsLoaded?.();
        }
      }
    },
    [selectedNodeId, setSuggestions, setLoadingSuggestions, onSuggestionsLoaded]
  );

  const handleUndo = useCallback(async () => {
    setUndoing(true);
    try {
      const graph = await undoGraph(repoId);
      setRawFeatures(graph.nodes);
      setRawEdges(graph.edges);
      const stillCanUndo = await canUndo(repoId);
      setUndoAvailable(stillCanUndo);
    } catch {
      // nothing to undo
      setUndoAvailable(false);
    } finally {
      setUndoing(false);
    }
  }, [repoId]);

  // Fetch graph data on mount
  useEffect(() => {
    async function load() {
      setGraphError(null);
      try {
        const graph = await getFeatureGraph(repoId);
        setRawFeatures(graph.nodes);
        setRawEdges(graph.edges);

        // Auto-collapse nodes with many children for cleaner initial view
        const childCounts = new Map<string, number>();
        for (const n of graph.nodes) {
          if (n.parent_feature_id) {
            childCounts.set(
              n.parent_feature_id,
              (childCounts.get(n.parent_feature_id) ?? 0) + 1
            );
          }
        }
        const initialCollapsed = new Set<string>();
        for (const [id, count] of childCounts) {
          if (count > 5) initialCollapsed.add(id);
        }
        setCollapsedNodes(initialCollapsed);

        const available = await canUndo(repoId);
        setUndoAvailable(available);
      } catch (err) {
        setGraphError(err instanceof Error ? err.message : "Failed to load graph");
        setRawFeatures([]);
        setRawEdges([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [repoId]);

  // Recompute layout when features or collapse state changes (not selection - preserves user positions)
  useEffect(() => {
    if (rawFeatures.length === 0) return;
    const result = buildLayout(
      rawFeatures,
      rawEdges,
      collapsedNodes,
      null,
      handleToggleCollapse,
      handleEdit
    );
    setNodes(result.nodes);
    setEdges(result.edges);
  }, [rawFeatures, rawEdges, collapsedNodes, handleToggleCollapse, handleEdit, setNodes, setEdges]);

  // Update selection state only when selectedNodeId changes (avoids full layout reset)
  useEffect(() => {
    setNodes((nodes) =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, selected: n.id === selectedNodeId },
      }))
    );
  }, [selectedNodeId, setNodes]);

  const handleNodeClick = useCallback(
    async (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
      onNodeSelect(node.id);
      setSuggestions([]);
      setLoadingSuggestions(true);
      try {
        const suggestions = await getSuggestions(node.id);
        setSuggestions(suggestions);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
        onSuggestionsLoaded?.();
      }
    },
    [onNodeSelect, setSuggestions, setLoadingSuggestions, onSuggestionsLoaded]
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading feature graph...</p>
        </div>
      </div>
    );
  }

  if (rawFeatures.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2 max-w-sm">
          {graphError ? (
            <>
              <p className="text-red-400 font-medium">Failed to load graph</p>
              <p className="text-xs text-muted-foreground">{graphError}</p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">No features detected yet.</p>
              <p className="text-xs text-muted-foreground">
                The analysis may still be running, or the repo may be empty.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#27272a" gap={24} />
        <Controls
          className="!bg-card !border-border !rounded-lg"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(node) =>
            (node.data as Record<string, unknown>)?.selected
              ? "#6d28d9"
              : "#27272a"
          }
          maskColor="rgba(0,0,0,0.7)"
          className="!bg-card !border-border !rounded-lg"
        />
      </ReactFlow>

      {/* Bottom bar */}
      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 rounded-lg bg-card/80 backdrop-blur-sm border border-border px-4 py-2 text-xs text-muted-foreground">
          <span>{rawFeatures.length} features</span>
          <span className="text-border">|</span>
          <span>{rawEdges.length} connections</span>
          {collapsedNodes.size > 0 && (
            <>
              <span className="text-border">|</span>
              <button
                onClick={() => setCollapsedNodes(new Set())}
                className="text-primary hover:underline"
              >
                Expand all
              </button>
            </>
          )}
        </div>

        {undoAvailable && (
          <button
            onClick={handleUndo}
            disabled={undoing}
            className="pointer-events-auto rounded-lg bg-card/80 backdrop-blur-sm border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {undoing ? "Undoing…" : "↩ Undo"}
          </button>
        )}
      </div>

      {/* Notification when generating (panel closed) */}
      {loadingSuggestions && (
        <div className="absolute top-4 right-4 flex items-center gap-3 rounded-xl bg-card/90 backdrop-blur-sm border border-border px-5 py-3 text-sm text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Generating suggestions...
        </div>
      )}
    </div>
  );
}
