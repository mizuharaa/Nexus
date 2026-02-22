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

const DESKTOP_NODES: GraphNode[] = [
  { id: "root",   label: "app/",          x: 8,   y: 50,  tier: "secondary", type: "config" },
  { id: "config", label: "config.yml",    x: 25,  y: 22,  tier: "secondary", type: "config" },
  { id: "auth",   label: "auth.ts",       x: 28,  y: 52,  tier: "secondary", type: "code" },
  { id: "env",    label: ".env",          x: 50,  y: 38,  tier: "primary",   type: "secrets" },
  { id: "routes", label: "api/routes.ts", x: 48,  y: 68,  tier: "secondary", type: "code" },
  { id: "cache",  label: "cache.ts",      x: 72,  y: 52,  tier: "tertiary",  type: "code" },
  { id: "docs",   label: "readme.md",     x: 75,  y: 24,  tier: "tertiary",  type: "code" },
  { id: "deploy", label: "deploy.sh",     x: 92,  y: 50,  tier: "secondary", type: "deploy" },
];

const MOBILE_NODES: GraphNode[] = [
  { id: "root",   label: "app/",          x: 12,  y: 15,  tier: "secondary", type: "config" },
  { id: "config", label: "config.yml",    x: 30,  y: 15,  tier: "secondary", type: "config" },
  { id: "auth",   label: "auth.ts",       x: 14,  y: 42,  tier: "secondary", type: "code" },
  { id: "env",    label: ".env",          x: 50,  y: 30,  tier: "primary",   type: "secrets" },
  { id: "routes", label: "api/routes.ts", x: 50,  y: 58,  tier: "secondary", type: "code" },
  { id: "cache",  label: "cache.ts",      x: 78,  y: 42,  tier: "tertiary",  type: "code" },
  { id: "docs",   label: "readme.md",     x: 78,  y: 15,  tier: "tertiary",  type: "code" },
  { id: "deploy", label: "deploy.sh",     x: 88,  y: 70,  tier: "secondary", type: "deploy" },
];

export const EDGES: GraphEdge[] = [
  { from: "root",   to: "config" },
  { from: "root",   to: "auth" },
  { from: "auth",   to: "env",    critical: true },
  { from: "config", to: "env",    critical: true },
  { from: "auth",   to: "routes" },
  { from: "routes", to: "cache" },
  { from: "cache",  to: "deploy" },
  { from: "config", to: "docs" },
  { from: "docs",   to: "deploy" },
];

export const CLUSTERS: Cluster[] = [
  { cx: 18, cy: 40, rx: 18, ry: 24 },
  { cx: 46, cy: 48, rx: 18, ry: 24 },
  { cx: 78, cy: 42, rx: 16, ry: 22 },
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
  const mx = (ax + bx) / 2 - dy * 0.12;
  const my = (ay + by) / 2 + dx * 0.12;
  return `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`;
}
