"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ThemePreference } from "@/lib/types";

type ThemeContextValue = {
  theme: ThemePreference;
  resolved: "light" | "dark";
  setTheme: (t: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function ThemeProvider({ initial = "system", children }: { initial?: ThemePreference; children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(initial);
  const [resolved, setResolved] = useState<"light" | "dark">(resolveTheme(initial));

  useEffect(() => {
    const stored = localStorage.getItem("hallsense-theme") as ThemePreference | null;
    if (stored) {
      setThemeState(stored);
      setResolved(resolveTheme(stored));
    }
  }, []);

  useEffect(() => {
    setResolved(resolveTheme(theme));
    document.documentElement.setAttribute("data-theme", resolveTheme(theme));
    localStorage.setItem("hallsense-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolved(mql.matches ? "dark" : "light");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
