export type NodeTier = "primary" | "secondary" | "tertiary";
export type NodeType = "secrets" | "code" | "config" | "deploy";

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  tier: NodeTier;
  type: NodeType;
}

export interface GraphEdge {
  from: string;
  to: string;
  critical?: boolean;
}

export interface Cluster {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/*
  Radial-tree hierarchy:
    Layer 0 (top):     root
    Layer 1:           config ─── auth
    Layer 2 (center):  docs ─── ENV (primary) ─── routes
    Layer 3:           cache ─── deploy
*/

const DESKTOP_NODES: GraphNode[] = [
  { id: "root",   label: "app/",          x: 50,  y: 10,  tier: "secondary", type: "config" },
  { id: "config", label: "config.yml",    x: 26,  y: 28,  tier: "secondary", type: "config" },
  { id: "auth",   label: "auth.ts",       x: 74,  y: 28,  tier: "secondary", type: "code" },
  { id: "docs",   label: "readme.md",     x: 18,  y: 52,  tier: "tertiary",  type: "code" },
  { id: "env",    label: ".env",          x: 50,  y: 48,  tier: "primary",   type: "secrets" },
  { id: "routes", label: "api/routes.ts", x: 82,  y: 52,  tier: "secondary", type: "code" },
  { id: "cache",  label: "cache.ts",      x: 32,  y: 76,  tier: "tertiary",  type: "code" },
  { id: "deploy", label: "deploy.sh",     x: 68,  y: 76,  tier: "secondary", type: "deploy" },
];

const MOBILE_NODES: GraphNode[] = [
  { id: "root",   label: "app/",          x: 50,  y: 10,  tier: "secondary", type: "config" },
  { id: "config", label: "config.yml",    x: 22,  y: 28,  tier: "secondary", type: "config" },
  { id: "auth",   label: "auth.ts",       x: 78,  y: 28,  tier: "secondary", type: "code" },
  { id: "docs",   label: "readme.md",     x: 14,  y: 55,  tier: "tertiary",  type: "code" },
  { id: "env",    label: ".env",          x: 50,  y: 48,  tier: "primary",   type: "secrets" },
  { id: "routes", label: "api/routes.ts", x: 86,  y: 55,  tier: "secondary", type: "code" },
  { id: "cache",  label: "cache.ts",      x: 30,  y: 78,  tier: "tertiary",  type: "code" },
  { id: "deploy", label: "deploy.sh",     x: 70,  y: 78,  tier: "secondary", type: "deploy" },
];

export const EDGES: GraphEdge[] = [
  { from: "root",   to: "config" },
  { from: "root",   to: "auth" },
  { from: "config", to: "env",    critical: true },
  { from: "auth",   to: "env",    critical: true },
  { from: "config", to: "docs" },
  { from: "auth",   to: "routes" },
  { from: "env",    to: "cache" },
  { from: "env",    to: "deploy" },
  { from: "routes", to: "deploy" },
];

export const CLUSTERS: Cluster[] = [
  { cx: 50, cy: 12, rx: 12, ry: 10 },
  { cx: 36, cy: 44, rx: 22, ry: 22 },
  { cx: 70, cy: 52, rx: 20, ry: 22 },
];

export function getNodes(isMobile: boolean): GraphNode[] {
  return isMobile ? MOBILE_NODES : DESKTOP_NODES;
}

export function getNodeById(nodes: GraphNode[], id: string) {
  return nodes.find((n) => n.id === id);
}

export function edgePath(
  nodes: GraphNode[],
  edge: GraphEdge,
  w: number,
  h: number
): string {
  const a = getNodeById(nodes, edge.from);
  const b = getNodeById(nodes, edge.to);
  if (!a || !b) return "";
  const ax = (a.x / 100) * w;
  const ay = (a.y / 100) * h;
  const bx = (b.x / 100) * w;
  const by = (b.y / 100) * h;
  const dx = bx - ax;
  const dy = by - ay;
  const cx = (ax + bx) / 2 - dy * 0.08;
  const cy = (ay + by) / 2 + dx * 0.08;
  return `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
}
