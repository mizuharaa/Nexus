import { useState } from "react";
import { motion } from "motion/react";
import {
  TrendingUp,
  Shield,
  Compass,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const branches = [
  {
    id: 1,
    name: "Expansion",
    theme: "New features & user growth",
    color: "#00d4ff",
    initiatives: [
      "Multi-language support",
      "Advanced analytics dashboard",
      "Mobile app development",
      "AI-powered recommendations",
      "Third-party integrations",
      "Premium tier features",
    ],
    architecture: {
      impact: "+7",
      description: "New microservices, expanded API surface",
    },
    scalability: {
      impact: "+5",
      description: "Increased infrastructure requirements",
    },
    risk: {
      impact: "+8",
      description: "Higher complexity, more failure points",
    },
    tradeoffs: [
      "Technical debt may accumulate faster",
      "Requires additional team resources",
      "Longer feature delivery timeline",
    ],
    executionOrder: [
      "Set up internationalization framework",
      "Build analytics data pipeline",
      "Design mobile app architecture",
      "Integrate AI/ML models",
      "Develop API connectors",
      "Create premium feature gate",
    ],
  },
  {
    id: 2,
    name: "Stability",
    theme: "Refactoring & optimization",
    color: "#00ff88",
    initiatives: [
      "Database query optimization",
      "Code refactoring & cleanup",
      "Test coverage expansion",
      "Performance monitoring",
      "Security audit & fixes",
      "Documentation overhaul",
    ],
    architecture: {
      impact: "-3",
      description: "Simplified dependencies, cleaner patterns",
    },
    scalability: {
      impact: "+3",
      description: "Better resource utilization",
    },
    risk: {
      impact: "-5",
      description: "Reduced technical debt, more reliable",
    },
    tradeoffs: [
      "Slower feature velocity short-term",
      "User-facing improvements less visible",
      "Team focus shift from innovation",
    ],
    executionOrder: [
      "Audit database queries & indexes",
      "Refactor critical path modules",
      "Expand unit & integration tests",
      "Implement APM tooling",
      "Conduct security penetration test",
      "Update technical documentation",
    ],
  },
  {
    id: 3,
    name: "Strategic Pivot",
    theme: "Market repositioning",
    color: "#ffb800",
    initiatives: [
      "Rebrand product positioning",
      "Target new customer segment",
      "Simplify core offering",
      "Partner ecosystem development",
      "Enterprise features",
      "Compliance certifications",
    ],
    architecture: {
      impact: "+4",
      description: "New business logic, adapted data models",
    },
    scalability: {
      impact: "+2",
      description: "Moderate infrastructure changes",
    },
    risk: {
      impact: "+6",
      description: "Market uncertainty, execution challenges",
    },
    tradeoffs: [
      "Potential alienation of existing users",
      "Requires significant marketing effort",
      "Uncertain ROI timeline",
    ],
    executionOrder: [
      "Validate new market with prototypes",
      "Redesign user onboarding flow",
      "Simplify product tiers",
      "Build partner integration SDK",
      "Add enterprise SSO & permissions",
      "Achieve SOC 2 compliance",
    ],
  },
];

export default function Futures() {
  const [compareMode, setCompareMode] = useState(false);
  const [expandedBranch, setExpandedBranch] = useState<number | null>(null);

  return (
    <div className="min-h-screen nexus-gradient-bg p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Simulate Futures
            </h1>
            <p className="text-white/65">
              Explore different roadmap strategies and their architectural impact
            </p>
          </div>
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`nexus-btn-secondary text-sm ${
              compareMode ? "bg-[#00d4ff]/20 border-[#00d4ff]/40" : ""
            }`}
          >
            {compareMode ? "Exit Compare" : "Compare Branches"}
          </button>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="max-w-7xl mx-auto">
        {compareMode ? (
          <CompareView branches={branches} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {branches.map((branch, index) => (
              <motion.div
                key={branch.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
              >
                <BranchCard
                  branch={branch}
                  expanded={expandedBranch === branch.id}
                  onToggle={() =>
                    setExpandedBranch(
                      expandedBranch === branch.id ? null : branch.id
                    )
                  }
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BranchCard({
  branch,
  expanded,
  onToggle,
}: {
  branch: typeof branches[0];
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon =
    branch.name === "Expansion"
      ? TrendingUp
      : branch.name === "Stability"
      ? Shield
      : Compass;

  return (
    <div className="nexus-glass-strong h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <div
          className="w-12 h-1 rounded-full mb-4"
          style={{ background: branch.color }}
        />
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: `${branch.color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color: branch.color }} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1">{branch.name}</h2>
            <p className="text-sm text-white/65">{branch.theme}</p>
          </div>
        </div>
      </div>

      {/* Initiatives */}
      <div className="p-6 border-b border-white/5">
        <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wide mb-3">
          Initiatives ({branch.initiatives.length})
        </h3>
        <ul className="space-y-2">
          {branch.initiatives.map((initiative, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-sm text-white/75"
            >
              <CheckCircle2
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: branch.color }}
              />
              <span>{initiative}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Impact Metrics */}
      <div className="p-6 border-b border-white/5">
        <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wide mb-3">
          Impact Analysis
        </h3>
        <div className="space-y-3">
          <ImpactMetric
            label="Architecture"
            value={branch.architecture.impact}
            description={branch.architecture.description}
          />
          <ImpactMetric
            label="Scalability"
            value={branch.scalability.impact}
            description={branch.scalability.description}
          />
          <ImpactMetric
            label="Risk"
            value={branch.risk.impact}
            description={branch.risk.description}
          />
        </div>
      </div>

      {/* Tradeoffs - Expandable */}
      <div className="p-6 border-b border-white/5">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between text-xs font-semibold text-white/45 uppercase tracking-wide mb-3 hover:text-white/65 transition-colors"
        >
          <span>Tradeoffs</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        {expanded && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {branch.tradeoffs.map((tradeoff, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-white/65"
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 text-[#ffb800] flex-shrink-0" />
                <span>{tradeoff}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </div>

      {/* Execution Order */}
      <div className="p-6 flex-1">
        <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wide mb-3">
          Recommended Execution Order
        </h3>
        <ol className="space-y-2">
          {branch.executionOrder.map((step, index) => (
            <li key={index} className="flex items-start gap-3 text-sm">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  background: `${branch.color}20`,
                  color: branch.color,
                }}
              >
                {index + 1}
              </span>
              <span className="text-white/75 mt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* CTA */}
      <div className="p-6 border-t border-white/5">
        <button
          className="w-full nexus-btn-primary text-sm justify-center"
          style={{
            background: `linear-gradient(135deg, ${branch.color} 0%, ${branch.color}bb 100%)`,
          }}
        >
          Select This Path <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}

function ImpactMetric({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  const isPositive = value.startsWith("+");
  const isNegative = value.startsWith("-");
  const color = isNegative
    ? "#00ff88"
    : isPositive
    ? "#ff3366"
    : "#ffb800";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-white/65">{label}</span>
        <span
          className="text-sm font-bold px-2 py-1 rounded"
          style={{
            background: `${color}20`,
            color,
          }}
        >
          {value}
        </span>
      </div>
      <p className="text-xs text-white/45">{description}</p>
    </div>
  );
}

function CompareView({ branches }: { branches: typeof branches }) {
  return (
    <div className="nexus-glass-strong overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <h2 className="text-xl font-bold text-white mb-2">Branch Comparison</h2>
        <p className="text-sm text-white/65">
          Side-by-side analysis of all roadmap paths
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/3 border-b border-white/5">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-white/65 uppercase tracking-wide">
                Metric
              </th>
              {branches.map((branch) => (
                <th
                  key={branch.id}
                  className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide"
                  style={{ color: branch.color }}
                >
                  {branch.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <CompareRow
              label="Theme"
              values={branches.map((b) => b.theme)}
              branches={branches}
            />
            <CompareRow
              label="Initiatives"
              values={branches.map((b) => `${b.initiatives.length} items`)}
              branches={branches}
            />
            <CompareRow
              label="Architecture Impact"
              values={branches.map((b) => b.architecture.impact)}
              branches={branches}
              isImpact
            />
            <CompareRow
              label="Scalability Impact"
              values={branches.map((b) => b.scalability.impact)}
              branches={branches}
              isImpact
            />
            <CompareRow
              label="Risk Impact"
              values={branches.map((b) => b.risk.impact)}
              branches={branches}
              isImpact
            />
            <CompareRow
              label="Execution Steps"
              values={branches.map((b) => `${b.executionOrder.length} steps`)}
              branches={branches}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  values,
  branches,
  isImpact = false,
}: {
  label: string;
  values: string[];
  branches: typeof branches;
  isImpact?: boolean;
}) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/3 transition-colors">
      <td className="px-6 py-4 text-sm font-medium text-white/65">{label}</td>
      {values.map((value, index) => (
        <td key={index} className="px-6 py-4 text-center">
          {isImpact ? (
            <span
              className="inline-block px-3 py-1 rounded-full text-sm font-bold"
              style={{
                background: `${getImpactColor(value)}20`,
                color: getImpactColor(value),
              }}
            >
              {value}
            </span>
          ) : (
            <span className="text-sm text-white/75">{value}</span>
          )}
        </td>
      ))}
    </tr>
  );
}

function getImpactColor(value: string): string {
  if (value.startsWith("-")) return "#00ff88";
  if (value.startsWith("+")) return "#ff3366";
  return "#ffb800";
}
