import { useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";

interface NavbarProps {
  variant?: "landing" | "app";
}

const dropdownContent = {
  features: {
    col1: [
      { label: "Feature Graph", href: "#graph" },
      { label: "AI Suggestions", href: "#suggestions" },
      { label: "Simulate Futures", href: "#futures" },
    ],
    col2: [
      { label: "Autonomous Build", href: "#build" },
      { label: "Risk Engine", href: "#risk" },
      { label: "Execution Logs", href: "#logs" },
    ],
  },
};

export default function Navbar({ variant = "landing" }: NavbarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  if (variant === "landing") {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B0B12]/95 backdrop-blur-sm border-b border-white/6">
        <div className="max-w-[1400px] mx-auto px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="nexus-logo">
            NEXUS
          </Link>

          {/* Center Nav */}
          <div className="hidden lg:flex items-center gap-12">
            <Link to="/dashboard" className="nexus-nav-item">
              Dashboard
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("features")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="nexus-nav-item flex items-center gap-2">
                Features
                <ChevronDown className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {activeDropdown === "features" && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="nexus-dropdown"
                  >
                    <div className="nexus-dropdown-grid">
                      <div className="nexus-dropdown-col">
                        {dropdownContent.features.col1.map((item) => (
                          <a
                            key={item.label}
                            href={item.href}
                            className="nexus-dropdown-item"
                          >
                            {item.label}
                          </a>
                        ))}
                      </div>
                      <div className="nexus-dropdown-col">
                        {dropdownContent.features.col2.map((item) => (
                          <a
                            key={item.label}
                            href={item.href}
                            className="nexus-dropdown-item"
                          >
                            {item.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <a href="#pricing" className="nexus-nav-item">
              Pricing
            </a>

            <a href="#docs" className="nexus-nav-item">
              Docs
            </a>
          </div>

          {/* Right CTA */}
          <div className="flex items-center gap-4">
            <button className="nexus-btn nexus-btn-ghost hidden md:block">
              Sign In
            </button>
            <Link to="/onboarding" className="nexus-btn nexus-btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return null;
}
