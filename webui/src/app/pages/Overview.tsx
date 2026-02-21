import { motion } from "motion/react";

export default function Overview() {
  return (
    <div className="min-h-screen bg-[#0B0B12] p-8">
      {/* Metrics Bar - High Contrast */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="nexus-metric"
        >
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">
            Features
          </div>
          <div className="nexus-metric-value">42</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="nexus-metric"
        >
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">
            Risk Score
          </div>
          <div className="nexus-metric-value text-[#FFB020]">58</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="nexus-metric"
        >
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">
            Drift
          </div>
          <div className="nexus-metric-value text-[#7B5CFF]">+3</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="nexus-metric"
        >
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">
            Active Runs
          </div>
          <div className="nexus-metric-value">2</div>
        </motion.div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Feature Graph Timeline - Left Large */}
        <div className="col-span-8 nexus-panel p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Feature Graph Timeline
            </h2>
            <button className="text-xs uppercase tracking-wider font-bold text-white/40 hover:text-white transition-colors">
              View Full →
            </button>
          </div>

          <div className="space-y-3">
            {[
              { name: "Payment Retry Logic", status: "complete", risk: "low", files: 3, time: "2h ago" },
              { name: "Add Caching Layer", status: "active", risk: "low", files: 2, time: "In progress" },
              { name: "Refactor Auth Module", status: "pending", risk: "medium", files: 5, time: "Queued" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="nexus-panel-bordered p-4 hover:border-white/12 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-sm ${
                      item.status === 'complete' ? 'bg-[#00D084]' :
                      item.status === 'active' ? 'bg-[#7B5CFF]' :
                      'bg-white/20'
                    }`} />
                    <span className="text-sm font-semibold text-white">{item.name}</span>
                  </div>
                  <span className={`nexus-badge ${
                    item.risk === 'low' ? 'nexus-badge-success' : 'nexus-badge-warning'
                  }`}>
                    {item.risk}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/40 ml-5">
                  <span>{item.files} files</span>
                  <span>•</span>
                  <span>{item.time}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Activity Feed - Right */}
        <div className="col-span-4 nexus-panel p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-6 pb-4 border-b border-white/6">
            Recent Changes
          </h2>

          <div className="space-y-4">
            {[
              { action: "PR Opened", detail: "Payment Retry Logic", time: "2h ago", type: "success" },
              { action: "Feature Built", detail: "Caching Layer", time: "5h ago", type: "success" },
              { action: "Risk Increase", detail: "Auth Module +3", time: "1d ago", type: "warning" },
              { action: "Test Coverage", detail: "+12% increase", time: "2d ago", type: "success" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="pb-4 border-b border-white/6 last:border-0"
              >
                <div className="text-xs font-bold text-white mb-1">{item.action}</div>
                <div className="text-xs text-white/50 mb-2">{item.detail}</div>
                <div className="text-[10px] text-white/30">{item.time}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Execution Logs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-6"
      >
        <div className="nexus-terminal">
          <div className="nexus-terminal-header">
            ACTIVE EXECUTION LOG / RUN #2041
          </div>
          <div className="nexus-terminal-body">
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
      </motion.div>
    </div>
  );
}
