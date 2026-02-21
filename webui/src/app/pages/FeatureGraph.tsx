import { useState, useCallback } from "react";
import AutoBuildModal from "../components/AutoBuildModal";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Link } from "react-router";
import {
  Search,
  Telescope,
  Zap,
  GitBranch,
  FileCode,
  Lock,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle2,
  LayoutGrid,
  Network,
} from "lucide-react";

const initialNodes: Node[] = [
  {
    id: "1",
    type: "custom",
    position: { x: 250, y: 50 },
    data: { label: "Core", icon: Network, risk: "low", complexity: 3, files: 12 },
  },
  {
    id: "2",
    type: "custom",
    position: { x: 100, y: 200 },
    data: { label: "Auth", icon: Lock, risk: "medium", complexity: 5, files: 8 },
  },
  {
    id: "3",
    type: "custom",
    position: { x: 400, y: 200 },
    data: { label: "API", icon: FileCode, risk: "low", complexity: 4, files: 15 },
  },
  {
    id: "4",
    type: "custom",
    position: { x: 100, y: 350 },
    data: { label: "Database", icon: Database, risk: "high", complexity: 7, files: 6 },
  },
  {
    id: "5",
    type: "custom",
    position: { x: 250, y: 350 },
    data: { label: "UI Components", icon: LayoutGrid, risk: "low", complexity: 2, files: 25 },
  },
  {
    id: "6",
    type: "custom",
    position: { x: 400, y: 350 },
    data: { label: "Tests", icon: Activity, risk: "low", complexity: 3, files: 18 },
  },
];

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#00d4ff" } },
  { id: "e1-3", source: "1", target: "3", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#00d4ff" } },
  { id: "e2-4", source: "2", target: "4", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#ffb800" } },
  { id: "e2-5", source: "2", target: "5", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#00d4ff" } },
  { id: "e3-6", source: "3", target: "6", markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#00ff88" } },
];

export default function FeatureGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [viewMode, setViewMode] = useState<"graph" | "tree">("graph");
  const [autoBuildOpen, setAutoBuildOpen] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const nodeTypes = {
    custom: CustomNode,
  };

  return (
    <div className="h-screen flex nexus-gradient-bg">
      {/* Main Graph Area */}
      <div className="flex-1 relative">
        {/* Top Controls */}
        <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Repo Selector */}
            <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm backdrop-blur-md focus:outline-none focus:border-[#00d4ff]/50">
              <option>my-saas-app</option>
              <option>portfolio-site</option>
              <option>api-backend</option>
            </select>

            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg backdrop-blur-md">
              <Search className="w-4 h-4 text-white/45" />
              <input
                type="text"
                placeholder="Search nodes..."
                className="bg-transparent border-none outline-none text-white text-sm placeholder:text-white/45 w-64"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg backdrop-blur-md">
              <button
                onClick={() => setViewMode("tree")}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === "tree"
                    ? "bg-[#00d4ff]/20 text-[#00d4ff]"
                    : "text-white/65 hover:text-white"
                }`}
              >
                Tree view
              </button>
              <button
                onClick={() => setViewMode("graph")}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === "graph"
                    ? "bg-[#00d4ff]/20 text-[#00d4ff]"
                    : "text-white/65 hover:text-white"
                }`}
              >
                Graph view
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/dashboard/futures"
              className="nexus-btn-secondary text-sm flex items-center gap-2"
            >
              <Telescope className="w-4 h-4" />
              Simulate Futures
            </Link>
            <button
              onClick={() => setAutoBuildOpen(true)}
              className="nexus-btn-primary text-sm flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Auto Build
            </button>
          </div>
        </div>

        {/* Graph */}
        <div className="w-full h-full" style={{ background: "#0a0a0f" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="nexus-flow"
          >
            <Background color="#ffffff10" />
            <Controls className="!bg-white/5 !border-white/10" />
          </ReactFlow>
        </div>
      </div>

      {/* Right Side Panel */}
      <div className="w-96 bg-[#0a0a0f] border-l border-white/5 overflow-y-auto nexus-scrollbar">
        {selectedNode ? (
          <div className="p-6">
            {/* Node Overview */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                {selectedNode.data.icon && (
                  <div className="w-12 h-12 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center">
                    <selectedNode.data.icon className="w-6 h-6 text-[#00d4ff]" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedNode.data.label}
                  </h2>
                  <p className="text-sm text-white/65">Feature node</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MetricCard
                  label="Risk"
                  value={selectedNode.data.risk}
                  color={getRiskColor(selectedNode.data.risk)}
                />
                <MetricCard
                  label="Complexity"
                  value={selectedNode.data.complexity}
                  color="#ffb800"
                />
                <MetricCard
                  label="Files"
                  value={selectedNode.data.files}
                  color="#00d4ff"
                />
              </div>
            </div>

            {/* Suggestions */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
                Suggestions (3–8)
              </h3>
              <div className="space-y-2">
                <SuggestionCard
                  title="Add input validation"
                  complexity="Low"
                  files={2}
                />
                <SuggestionCard
                  title="Implement caching layer"
                  complexity="Medium"
                  files={4}
                />
                <SuggestionCard
                  title="Add error boundaries"
                  complexity="Low"
                  files={3}
                />
              </div>
            </div>

            {/* Risk Hotspots */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
                Risk hotspots
              </h3>
              <div className="space-y-2">
                <RiskItem risk="low" label="Authentication flow" />
                <RiskItem risk="medium" label="Database connections" />
                <RiskItem risk="low" label="API endpoints" />
              </div>
            </div>

            {/* Impacted Files */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
                Impacted files (estimated)
              </h3>
              <div className="space-y-2 text-sm">
                <FileItem path="src/auth/login.ts" />
                <FileItem path="src/auth/register.ts" />
                <FileItem path="src/auth/middleware.ts" />
                <FileItem path="src/utils/validate.ts" />
              </div>
            </div>

            {/* Suggested Tests */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
                Suggested tests
              </h3>
              <div className="space-y-2 text-sm text-white/65">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00ff88] mt-0.5 flex-shrink-0" />
                  <span>Unit tests for authentication logic</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00ff88] mt-0.5 flex-shrink-0" />
                  <span>Integration tests for login flow</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00ff88] mt-0.5 flex-shrink-0" />
                  <span>E2E tests for complete auth journey</span>
                </div>
              </div>
            </div>

            {/* Implementation Sketch */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
                Implementation sketch
              </h3>
              <div className="nexus-terminal text-xs">
                <div className="mb-2 text-white/45">// Step 1: Add validation</div>
                <div className="mb-2">validateInput(data)</div>
                <div className="mb-2 text-white/45">// Step 2: Hash password</div>
                <div className="mb-2">const hash = await bcrypt.hash()</div>
                <div className="mb-2 text-white/45">// Step 3: Store in DB</div>
                <div>await db.users.create()</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-white/45">
            <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a node to view details</p>
          </div>
        )}
      </div>

      <AutoBuildModal
        isOpen={autoBuildOpen}
        onClose={() => setAutoBuildOpen(false)}
        featureName={selectedNode?.data?.label ?? "Selected feature"}
      />
    </div>
  );
}

// Custom Node Component
function CustomNode({ data }: { data: any }) {
  const Icon = data.icon;
  const riskColor = getRiskColor(data.risk);

  return (
    <div
      className="px-4 py-3 rounded-xl bg-white/5 border backdrop-blur-md min-w-[160px] cursor-pointer hover:bg-white/8 transition-all"
      style={{ borderColor: `${riskColor}40` }}
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5 text-[#00d4ff]" />}
        <div className="flex-1">
          <div className="font-medium text-white text-sm mb-1">{data.label}</div>
          <div className="flex items-center gap-2 text-xs text-white/45">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: riskColor }}
            />
            <span>{data.risk}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="nexus-glass p-3">
      <div className="text-xs text-white/45 mb-1">{label}</div>
      <div className="text-lg font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function SuggestionCard({
  title,
  complexity,
  files,
}: {
  title: string;
  complexity: string;
  files: number;
}) {
  return (
    <div className="nexus-glass p-3 hover:bg-white/8 transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-white flex-1">{title}</h4>
        <span className="text-xs px-2 py-1 rounded-full bg-[#ffb800]/20 text-[#ffb800]">
          {complexity}
        </span>
      </div>
      <div className="text-xs text-white/45">{files} files</div>
    </div>
  );
}

function RiskItem({ risk, label }: { risk: string; label: string }) {
  const color = getRiskColor(risk);
  return (
    <div className="flex items-center gap-3 text-sm">
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: color }}
      />
      <span className="text-white/65">{label}</span>
    </div>
  );
}

function FileItem({ path }: { path: string }) {
  return (
    <div className="flex items-center gap-2 text-white/65 hover:text-white transition-colors cursor-pointer">
      <FileCode className="w-4 h-4 text-white/45" />
      <code className="text-xs">{path}</code>
    </div>
  );
}

function getRiskColor(risk: string): string {
  switch (risk) {
    case "low":
      return "#00ff88";
    case "medium":
      return "#ffb800";
    case "high":
      return "#ff3366";
    default:
      return "#00d4ff";
  }
}

// Custom styles for React Flow
const style = document.createElement("style");
style.textContent = `
  .nexus-flow .react-flow__node {
    border-radius: 12px;
  }
  .nexus-flow .react-flow__edge-path {
    stroke-width: 2;
  }
  .nexus-flow .react-flow__controls {
    border-radius: 8px;
  }
  .nexus-flow .react-flow__controls button {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    color: white;
  }
  .nexus-flow .react-flow__controls button:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;
document.head.appendChild(style);
