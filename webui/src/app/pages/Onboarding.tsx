import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Github,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Code2,
  GitBranch,
  Activity,
  AlertCircle,
} from "lucide-react";

const steps = [
  { id: 1, name: "Connect GitHub", description: "Authorize access to repositories" },
  { id: 2, name: "Select Repository", description: "Choose which repo to analyze" },
  { id: 3, name: "Start Analysis", description: "Begin feature graph generation" },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const navigate = useNavigate();

  const repos = [
    { name: "my-saas-app", stars: 42, loc: "24.5k", language: "TypeScript" },
    { name: "portfolio-site", stars: 8, loc: "3.2k", language: "React" },
    { name: "api-backend", stars: 15, loc: "12.8k", language: "Node.js" },
    { name: "mobile-app", stars: 31, loc: "18.3k", language: "React Native" },
  ];

  const handleConnectGitHub = () => {
    // Simulate GitHub OAuth
    setTimeout(() => {
      setCurrentStep(2);
    }, 1000);
  };

  const handleSelectRepo = (repoName: string) => {
    setSelectedRepo(repoName);
  };

  const handleStartAnalysis = () => {
    setCurrentStep(3);
    setIsAnalyzing(true);

    // Simulate analysis progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setAnalysisProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#0B0B12] flex items-center justify-center p-6">
      <div className="nexus-grid-overlay" />
      
      <div className="w-full max-w-4xl relative z-10">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center mb-12">
          <span className="nexus-logo-text nexus-logo-stripe">
            NEXUS
          </span>
        </Link>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded flex items-center justify-center font-bold transition-all ${
                    currentStep >= step.id
                      ? "bg-[#7B5CFF] text-white"
                      : "nexus-panel text-white/40"
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="hidden md:block">
                  <div
                    className={`text-sm font-semibold ${
                      currentStep >= step.id ? "text-white" : "text-white/40"
                    }`}
                  >
                    {step.name}
                  </div>
                  <div className="text-xs text-white/40">{step.description}</div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-px mx-4 transition-all ${
                    currentStep > step.id ? "bg-[#7B5CFF]" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="nexus-panel-strong p-8"
        >
          {currentStep === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded flex items-center justify-center mx-auto mb-6 bg-[#7B5CFF]/10">
                <Github className="w-8 h-8 text-[#7B5CFF]" />
              </div>
              <h2 className="text-3xl font-black text-white mb-3">
                Connect Your GitHub Account
              </h2>
              <p className="text-white/60 mb-8 max-w-md mx-auto">
                We'll need access to your repositories to analyze your codebase
                and generate the feature graph.
              </p>
              <button
                onClick={handleConnectGitHub}
                className="nexus-btn nexus-btn-primary"
              >
                <Github className="w-5 h-5" />
                Authorize GitHub
                <ChevronRight className="w-5 h-5" />
              </button>
              <p className="text-xs text-white/40 mt-6">
                We only request read access to repository metadata and code
              </p>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-3 text-center">
                Select a Repository
              </h2>
              <p className="text-white/65 mb-8 text-center">
                Choose which repository you'd like to analyze with Nexus
              </p>

              <div className="space-y-3 mb-8">
                {repos.map((repo) => (
                  <button
                    key={repo.name}
                    onClick={() => handleSelectRepo(repo.name)}
                    className={`w-full p-4 rounded-lg border transition-all text-left ${
                      selectedRepo === repo.name
                        ? "bg-[#00d4ff]/10 border-[#00d4ff]"
                        : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GitBranch className="w-5 h-5 text-[#00d4ff]" />
                        <div>
                          <div className="font-semibold text-white">
                            {repo.name}
                          </div>
                          <div className="text-sm text-white/45">
                            {repo.language} • {repo.loc} LOC • ⭐ {repo.stars}
                          </div>
                        </div>
                      </div>
                      {selectedRepo === repo.name && (
                        <CheckCircle2 className="w-5 h-5 text-[#00d4ff]" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {selectedRepo && (
                <div className="flex items-center gap-3 p-4 bg-[#ffb800]/10 border border-[#ffb800]/20 rounded-lg mb-6">
                  <AlertCircle className="w-5 h-5 text-[#ffb800] flex-shrink-0" />
                  <div className="text-sm text-white/75">
                    Analysis may take 2-5 minutes for repositories with{" "}
                    <span className="font-semibold">10k+ lines</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="nexus-btn-secondary"
                >
                  Back
                </button>
                <button
                  onClick={handleStartAnalysis}
                  disabled={!selectedRepo}
                  className="nexus-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Analysis
                  <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#00d4ff]/10 flex items-center justify-center mx-auto mb-6">
                {isAnalyzing ? (
                  <Loader2 className="w-8 h-8 text-[#00d4ff] animate-spin" />
                ) : (
                  <CheckCircle2 className="w-8 h-8 text-[#00ff88]" />
                )}
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">
                {analysisProgress < 100
                  ? "Analyzing Repository..."
                  : "Analysis Complete!"}
              </h2>

              <p className="text-white/65 mb-8">
                {analysisProgress < 100
                  ? "Building your feature graph and extracting insights"
                  : "Redirecting to your dashboard..."}
              </p>

              {/* Progress Bar */}
              <div className="max-w-md mx-auto mb-8">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${analysisProgress}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-gradient-to-r from-[#00d4ff] to-[#0099ff]"
                  />
                </div>
                <div className="mt-2 text-sm text-white/45">
                  {analysisProgress}% complete
                </div>
              </div>

              {/* Analysis Steps */}
              <div className="max-w-md mx-auto space-y-3">
                <AnalysisStep
                  icon={<GitBranch className="w-4 h-4" />}
                  label="Scanning repository structure"
                  complete={analysisProgress > 20}
                />
                <AnalysisStep
                  icon={<Code2 className="w-4 h-4" />}
                  label="Identifying features and dependencies"
                  complete={analysisProgress > 40}
                />
                <AnalysisStep
                  icon={<Activity className="w-4 h-4" />}
                  label="Calculating complexity metrics"
                  complete={analysisProgress > 60}
                />
                <AnalysisStep
                  icon={<AlertCircle className="w-4 h-4" />}
                  label="Detecting risk hotspots"
                  complete={analysisProgress > 80}
                />
                <AnalysisStep
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  label="Generating suggestions"
                  complete={analysisProgress === 100}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-white/45">
            Need help?{" "}
            <a href="#docs" className="text-[#00d4ff] hover:underline">
              View documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function AnalysisStep({
  icon,
  label,
  complete,
}: {
  icon: React.ReactNode;
  label: string;
  complete: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
        complete ? "bg-[#00ff88]/10" : "bg-white/5"
      }`}
    >
      <div
        className={`flex-shrink-0 ${
          complete ? "text-[#00ff88]" : "text-white/45"
        }`}
      >
        {icon}
      </div>
      <div className={`text-sm ${complete ? "text-white" : "text-white/45"}`}>
        {label}
      </div>
      {complete && <CheckCircle2 className="w-4 h-4 text-[#00ff88] ml-auto" />}
    </div>
  );
}