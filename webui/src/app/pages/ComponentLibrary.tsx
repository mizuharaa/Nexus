import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Github,
  Copy,
} from "lucide-react";

export default function ComponentLibrary() {
  const [hoveredNode, setHoveredNode] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B0B12] text-white p-8">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-16">
          <Link
            to="/"
            className="text-sm uppercase tracking-wider text-white/40 hover:text-white transition-colors mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-display text-white mb-4">
            Nexus Design System
          </h1>
          <p className="text-base text-white/50">
            Infrastructure-grade components for cutting-edge AI applications
          </p>
        </div>

        {/* Color Palette */}
        <section className="mb-20">
          <h2 className="text-heading text-white mb-6">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="nexus-panel p-6">
              <div className="w-full h-24 bg-[#0B0B12] rounded mb-3 border border-white/10" />
              <div className="text-sm font-bold">#0B0B12</div>
              <div className="text-xs text-white/40">Background</div>
            </div>
            <div className="nexus-panel p-6">
              <div className="w-full h-24 bg-[#7B5CFF] rounded mb-3" />
              <div className="text-sm font-bold">#7B5CFF</div>
              <div className="text-xs text-white/40">Electric Violet</div>
            </div>
            <div className="nexus-panel p-6">
              <div className="w-full h-24 bg-[#C14CFF] rounded mb-3" />
              <div className="text-sm font-bold">#C14CFF</div>
              <div className="text-xs text-white/40">Magenta</div>
            </div>
            <div className="nexus-panel p-6">
              <div className="w-full h-24 bg-[#38D9FF] rounded mb-3" />
              <div className="text-sm font-bold">#38D9FF</div>
              <div className="text-xs text-white/40">Cyan Accent</div>
            </div>
            <div className="nexus-panel p-6">
              <div className="w-full h-24 bg-[#00D084] rounded mb-3" />
              <div className="text-sm font-bold">#00D084</div>
              <div className="text-xs text-white/40">Success</div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-20">
          <h2 className="text-heading text-white mb-6">Typography</h2>
          <div className="space-y-6 nexus-panel p-8">
            <div>
              <div className="text-hero">HERO TEXT</div>
              <code className="text-xs text-white/40 mt-2 block">
                .text-hero / 52-120px / font-weight: 800
              </code>
            </div>
            <div>
              <div className="text-display">Display Heading</div>
              <code className="text-xs text-white/40 mt-2 block">
                .text-display / 32-64px / font-weight: 800
              </code>
            </div>
            <div>
              <div className="text-heading">Section Heading</div>
              <code className="text-xs text-white/40 mt-2 block">
                .text-heading / 24-40px / font-weight: 700
              </code>
            </div>
            <div>
              <div className="text-base">
                Body text for paragraphs and longer content
              </div>
              <code className="text-xs text-white/40 mt-2 block">
                text-base / 16px / font-weight: 400
              </code>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="mb-20">
          <h2 className="text-heading text-white mb-6">Buttons</h2>
          <div className="nexus-panel p-8">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <button className="nexus-btn nexus-btn-primary">
                <Github className="w-4 h-4" />
                Primary Button
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="nexus-btn nexus-btn-secondary">
                Secondary Button
              </button>
              <button className="nexus-btn nexus-btn-ghost">Ghost Button</button>
              <button className="nexus-btn nexus-btn-primary" disabled>
                Disabled
              </button>
            </div>
            <code className="text-xs text-white/40">
              .nexus-btn .nexus-btn-primary / secondary / ghost
            </code>
          </div>
        </section>

        {/* Badges */}
        <section className="mb-20">
          <h2 className="text-heading text-white mb-6">Badges</h2>
          <div className="nexus-panel p-8">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="nexus-badge nexus-badge-success">Low Risk</span>
              <span className="nexus-badge nexus-badge-warning">
                Medium Risk
              </span>
              <span className="nexus-badge nexus-badge-error">High Risk</span>
            </div>
            <code className="text-xs text-white/40">
              .nexus-badge .nexus-badge-success / warning / error
            </code>
          </div>
        </section>

        {/* Panels */}
        <section className="mb-20">
          <h2 className="text-heading text-white mb-6">Panels</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="nexus-panel p-6">
              <h3 className="text-lg font-bold mb-2">Standard Panel</h3>
              <p className="text-sm text-white/60 mb-4">
                Default panel with surface background
              </p>
              <code className="text-xs text-white/40">.nexus-panel</code>
            </div>
            <div className="nexus-panel-bordered p-6">
              <h3 className="text-lg font-bold mb-2">Bordered Panel</h3>
              <p className="text-sm text-white/60 mb-4">
                Transparent with border only
              </p>
              <code className="text-xs text-white/40">.nexus-panel-bordered</code>
            </div>
          </div>
        </section>

        {/* Nodes */}
        <section className="mb-20">
          <h2 className="text-heading text-white mb-6">Graph Nodes</h2>
          <div className="nexus-panel p-12">
            <div className="flex items-center gap-8">
              <div
                className="nexus-node cursor-pointer"
                onMouseEnter={() => setHoveredNode(true)}
                onMouseLeave={() => setHoveredNode(false)}
              >
                <div className="flex items-center gap-2">
                  <div className="nexus-node-dot" />
                  <span>Default Node</span>
                </div>
              </div>
              <div className="nexus-node active">
                <div className="flex items-center gap-2">
                  <div className="nexus-node-dot" />
                  <span>Active Node</span>
                </div>
              </div>
            </div>
            <code className="text-xs text-white/40 mt-6 block">
              .nexus-node .nexus-node.active
            </code>
          </div>
        </section>

        {/* Metrics */}
        <section className="mb-20">
          <h2 className="text-heading text-white mb-6">Metric Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="nexus-metric">
              <div className="nexus-metric-value">247</div>
              <div className="nexus-metric-label">Total Features</div>
            </div>
            <div className="nexus-metric">
              <div className="nexus-metric-value text-[#FFB020]">58</div>
              <div className="nexus-metric-label">Risk Score</div>
            </div>
            <div className="nexus-metric">
              <div className="nexus-metric-value text-[#7B5CFF]">+3</div>
              <div className="nexus-metric-label">Drift</div>
            </div>
            <div className="nexus-metric">
              <div className="nexus-metric-value text-[#00D084]">2</div>
              <div className="nexus-metric-label">Active Runs</div>
            </div>
          </div>
        </section>

        {/* Terminal */}
        <section className="mb-20">
          <h2 className="text-heading text-white mb-6">Terminal</h2>
          <div className="nexus-terminal-cinematic">
            <div className="nexus-terminal-cinematic-content">
              <div className="nexus-terminal-header">
                SANDBOX / RUN #2841 / MAIN BRANCH
              </div>
              <div className="nexus-terminal-body p-4">
                <div className="nexus-terminal-line success">
                  <span>Sandbox created successfully</span>
                </div>
                <div className="nexus-terminal-line success">
                  <span>Generated test suite (8 tests)</span>
                </div>
                <div className="nexus-terminal-line">
                  <span>Implementing feature logic...</span>
                  <span className="nexus-terminal-cursor" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-20">
          <h2 className="text-heading text-white mb-6">Timeline</h2>
          <div className="nexus-panel p-8">
            <div className="nexus-timeline">
              <div className="nexus-timeline-step complete">
                <div className="nexus-timeline-dot" />
                <span className="text-sm font-semibold">Sandbox Created</span>
              </div>
              <div className="nexus-timeline-step complete">
                <div className="nexus-timeline-dot" />
                <span className="text-sm font-semibold">Tests Written</span>
              </div>
              <div className="nexus-timeline-step active">
                <div className="nexus-timeline-dot" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    Feature Implemented
                  </span>
                  <span className="nexus-badge nexus-badge-success text-[10px]">
                    IN PROGRESS
                  </span>
                </div>
              </div>
              <div className="nexus-timeline-step">
                <div className="nexus-timeline-dot" />
                <span className="text-sm font-semibold text-white/50">
                  PR Opened
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Icons */}
        <section className="mb-20">
          <h2 className="text-heading text-white mb-6">Status Icons</h2>
          <div className="nexus-panel p-8">
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-[#00D084]" />
                <span className="text-xs text-white/40">Success</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <AlertTriangle className="w-8 h-8 text-[#FFB020]" />
                <span className="text-xs text-white/40">Warning</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <XCircle className="w-8 h-8 text-[#FF4757]" />
                <span className="text-xs text-white/40">Error</span>
              </div>
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="mb-20">
          <h2 className="text-heading text-white mb-6">Grid System</h2>
          <div className="nexus-panel p-8">
            <div className="grid grid-cols-12 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[#7B5CFF]/20 border border-[#7B5CFF]/40 h-12 flex items-center justify-center text-xs"
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <code className="text-xs text-white/40 mt-6 block">
              grid-cols-12 gap-4
            </code>
          </div>
        </section>
      </div>
    </div>
  );
}
