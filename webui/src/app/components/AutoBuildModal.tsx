import { useState, useEffect } from "react";
import { X, CheckCircle2, Activity, AlertTriangle, ExternalLink } from "lucide-react";

interface AutoBuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

const executionSteps = [
  { id: 1, label: "Sandbox created", duration: 500 },
  { id: 2, label: "Branch created", duration: 800 },
  { id: 3, label: "Plan.md generated", duration: 1200 },
  { id: 4, label: "Tests generated", duration: 2000 },
  { id: 5, label: "Claude execution", duration: 3000 },
  { id: 6, label: "Verification loop", duration: 2500 },
  { id: 7, label: "PR opened", duration: 1000 },
];

const constraints = [
  "Max 25 files",
  "No .env files",
  "No CI configs",
  "Scope locked",
];

const logs = [
  "[00:01] Initializing sandbox environment...",
  "[00:02] Creating feature branch: feature/oauth-integration",
  "[00:03] Analyzing existing codebase structure...",
  "[00:05] Generating implementation plan...",
  "[00:07] Writing unit tests for authentication flow...",
  "[00:12] Implementing OAuth2 provider integration...",
  "[00:15] Adding middleware for token validation...",
  "[00:18] Running test suite...",
  "[00:21] All tests passed ✓",
  "[00:22] Running ESLint...",
  "[00:23] No lint errors found ✓",
  "[00:24] Committing changes...",
  "[00:25] Opening pull request...",
  "[00:26] PR #42 created successfully ✓",
];

export default function AutoBuildModal({
  isOpen,
  onClose,
  featureName = "OAuth2 Integration",
}: AutoBuildModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setIsComplete(false);
      setVisibleLogs([]);
      return;
    }

    // Simulate step progression
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1;
        if (next >= executionSteps.length) {
          clearInterval(stepInterval);
          setIsComplete(true);
          return prev;
        }
        return next;
      });
    }, 2000);

    // Simulate log streaming
    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < logs.length) {
        setVisibleLogs((prev) => [...prev, logs[logIndex]]);
        logIndex++;
      } else {
        clearInterval(logInterval);
      }
    }, 1800);

    return () => {
      clearInterval(stepInterval);
      clearInterval(logInterval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <div className="nexus-glass-strong max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Auto Build</h2>
            <p className="text-sm text-white/65">{featureName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white/65" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Stepper */}
          <div className="w-80 p-6 border-r border-white/5 overflow-y-auto nexus-scrollbar">
            <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wide mb-4">
              Execution Timeline
            </h3>
            <div className="space-y-3">
              {executionSteps.map((step, index) => {
                const isActive = currentStep === index;
                const isComplete = currentStep > index;

                return (
                  <div key={step.id} className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                        isComplete
                          ? "bg-[#00ff88]/20 text-[#00ff88]"
                          : isActive
                          ? "bg-[#00d4ff]/20 text-[#00d4ff] nexus-glow-sm"
                          : "bg-white/10 text-white/45"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isActive ? (
                        <Activity className="w-5 h-5 animate-pulse" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <div
                        className={`text-sm ${
                          isActive || isComplete ? "text-white" : "text-white/45"
                        }`}
                      >
                        {step.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Constraints */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wide mb-3">
                Constraints
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {constraints.map((constraint, index) => (
                  <div
                    key={index}
                    className="text-xs px-2 py-1 rounded bg-white/5 text-white/65 text-center"
                  >
                    {constraint}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Logs */}
          <div className="flex-1 flex flex-col">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-xs font-semibold text-white/45 uppercase tracking-wide">
                Live Logs
              </h3>
            </div>
            <div className="flex-1 p-6 overflow-y-auto nexus-scrollbar">
              <div className="nexus-terminal h-full">
                {visibleLogs.map((log, index) => (
                  <div
                    key={index}
                    className="mb-2 flex items-start gap-2 opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {log.includes("✓") ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00ff88] mt-0.5 flex-shrink-0" />
                    ) : log.includes("error") ? (
                      <AlertTriangle className="w-4 h-4 text-[#ff3366] mt-0.5 flex-shrink-0" />
                    ) : (
                      <Activity className="w-4 h-4 text-[#00d4ff] mt-0.5 flex-shrink-0" />
                    )}
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5">
          {isComplete ? (
            <div className="space-y-4">
              {/* Success Summary */}
              <div className="nexus-glass p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#00ff88]/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-[#00ff88]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">
                    Build Complete!
                  </h3>
                  <p className="text-sm text-white/65 mb-3">
                    Feature successfully implemented and tested. Pull request is
                    ready for review.
                  </p>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00ff88]" />
                      <span className="text-white/65">Tests passed</span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00ff88]" />
                      <span className="text-white/65">Lint passed</span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                      <span className="text-white/65">15 files changed</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button className="nexus-btn-primary flex-1 justify-center flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  View Pull Request
                </button>
                <button onClick={onClose} className="nexus-btn-secondary">
                  Close
                </button>
              </div>

              {/* Review Summary */}
              <div className="text-xs text-white/45 p-4 bg-white/5 rounded-lg">
                <div className="font-semibold text-white/65 mb-2">
                  Review Summary:
                </div>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Added OAuth2 provider configuration</li>
                  <li>Implemented token validation middleware</li>
                  <li>Created comprehensive test coverage (95%)</li>
                  <li>Updated authentication flow documentation</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-[#00d4ff] animate-pulse" />
                <div>
                  <div className="text-sm font-medium text-white">
                    Building...
                  </div>
                  <div className="text-xs text-white/45">
                    Step {currentStep + 1} of {executionSteps.length}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="nexus-btn-ghost">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add animation keyframes
const style = document.createElement("style");
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;
document.head.appendChild(style);
