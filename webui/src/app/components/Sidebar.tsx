import { Link, useLocation } from "react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  GitBranch,
  Telescope,
  Menu,
  X,
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
    { icon: GitBranch, label: "Feature Graph", path: "/dashboard/graph" },
    { icon: Telescope, label: "Futures", path: "/dashboard/futures" },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 nexus-btn nexus-btn-ghost"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static w-64 h-screen bg-[#0B0B12] border-r border-white/5 flex flex-col z-40 transition-transform duration-300 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link to="/" className="flex items-center">
            <span className="nexus-logo-text nexus-logo-stripe">
              NEXUS
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto nexus-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded transition-all relative ${
                  isActive
                    ? "bg-white/5 text-white"
                    : "text-white/60 hover:bg-white/3 hover:text-white"
                }`}
              >
                {isActive && <div className="nexus-active-indicator" />}
                <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-white/5">
          <div className="nexus-panel p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-gradient-to-br from-[#7B5CFF] to-[#C14CFF] flex items-center justify-center text-sm font-bold">
                D
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  Developer
                </div>
                <div className="text-xs text-white/40">Free Plan</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
