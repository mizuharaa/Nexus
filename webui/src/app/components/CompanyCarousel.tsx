import { useTheme } from "./ThemeProvider";

// Real tech companies with clean text-based wordmarks
const companies = [
  { name: "Vercel", weight: 700, spacing: "0.02em" },
  { name: "Linear", weight: 600, spacing: "0em" },
  { name: "Stripe", weight: 700, spacing: "0.01em" },
  { name: "GitHub", weight: 600, spacing: "-0.01em" },
  { name: "GitLab", weight: 700, spacing: "0em" },
  { name: "Notion", weight: 600, spacing: "0em" },
  { name: "Figma", weight: 700, spacing: "-0.01em" },
  { name: "Supabase", weight: 600, spacing: "-0.01em" },
  { name: "Railway", weight: 700, spacing: "0em" },
  { name: "Render", weight: 600, spacing: "0.01em" },
  { name: "Prisma", weight: 700, spacing: "0em" },
  { name: "Retool", weight: 600, spacing: "0.01em" },
  { name: "Sentry", weight: 700, spacing: "0em" },
  { name: "Datadog", weight: 600, spacing: "-0.01em" },
];

export default function CompanyCarousel() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const doubled = [...companies, ...companies];

  return (
    <div className="relative overflow-hidden py-10" style={{ zIndex: 10 }}>
      {/* Fade edges */}
      <div
        className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
        style={{ background: `linear-gradient(to right, ${isDark ? "#0B0B12" : "#F5F5F7"}, transparent)` }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
        style={{ background: `linear-gradient(to left, ${isDark ? "#0B0B12" : "#F5F5F7"}, transparent)` }}
      />

      {/* Label */}
      <div className="text-center mb-8">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" }}
        >
          Trusted by engineering teams at
        </span>
      </div>

      {/* Scrolling track */}
      <div className="flex" style={{ animation: "carouselScroll 45s linear infinite" }}>
        {doubled.map((company, i) => (
          <div
            key={`${company.name}-${i}`}
            className="flex items-center flex-shrink-0 mx-10"
            style={{ minWidth: "fit-content" }}
          >
            <span
              className="text-[18px] whitespace-nowrap select-none"
              style={{
                color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)",
                fontWeight: company.weight,
                letterSpacing: company.spacing,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif",
              }}
            >
              {company.name}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes carouselScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
