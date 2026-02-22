import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (e?: React.MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nexus-theme");
      if (saved === "light" || saved === "dark") return saved;
    }
    return "dark";
  });

  useEffect(() => {
    localStorage.setItem("nexus-theme", theme);
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("nexus-light");
      root.classList.remove("nexus-dark");
    } else {
      root.classList.add("nexus-dark");
      root.classList.remove("nexus-light");
    }
  }, [theme]);

  const toggleTheme = useCallback((e?: React.MouseEvent) => {
    const next: Theme = theme === "dark" ? "light" : "dark";

    if (
      e &&
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const x = e.clientX;
      const y = e.clientY;
      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const style = document.createElement("style");
      style.textContent = `
        ::view-transition-old(root),
        ::view-transition-new(root) {
          animation: none;
          mix-blend-mode: normal;
        }
        ::view-transition-new(root) {
          clip-path: circle(0px at ${x}px ${y}px);
          animation: nexusThemeReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes nexusThemeReveal {
          to { clip-path: circle(${maxRadius}px at ${x}px ${y}px); }
        }
      `;
      document.head.appendChild(style);

      (document as any).startViewTransition(() => {
        setTheme(next);
      }).finished.then(() => {
        style.remove();
      });
    } else {
      setTheme(next);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
