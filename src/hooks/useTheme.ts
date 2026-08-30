import { useEffect, useState, useCallback } from "react";

export type Theme = "dark" | "light" | "system";

const STORAGE_KEY = "pocketcto-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme) || "dark";
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    const isDark =
      t === "dark" ||
      (t === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    root.classList.remove("light", "dark");
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
    }
  };

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme, isDark: theme === "dark" };
}
