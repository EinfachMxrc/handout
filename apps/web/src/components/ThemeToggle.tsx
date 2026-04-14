"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";

type Mode = "light" | "dark" | "system";

export function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme();

  const mode = (theme ?? "system") as Mode;
  const cycle = () => {
    const next: Mode = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setTheme(next);
  };

  const effectiveMode = useMemo<Mode>(() => {
    if (mode === "system") {
      return resolvedTheme === "dark" ? "dark" : "light";
    }
    return mode;
  }, [mode, resolvedTheme]);

  const label =
    mode === "light" ? "Zu Dunkel wechseln" : mode === "dark" ? "Zu System wechseln" : "Zu Hell wechseln";

  return (
    <button
      onClick={cycle}
      className="theme-toggle"
      aria-label={label}
      title={`Theme: ${mode === "system" ? "System" : mode === "dark" ? "Dunkel" : "Hell"}`}
    >
      {effectiveMode === "light" && (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}
      {effectiveMode === "dark" && (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
      {mode === "system" && (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="4" width="18" height="12" rx="2" strokeLinejoin="round" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 20h8M12 16v4" />
        </svg>
      )}
    </button>
  );
}
