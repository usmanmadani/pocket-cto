import { useEffect, useState, useCallback } from "react";

export type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "pocketcto-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  const applyTheme = useCallback((t: Theme) => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = t === "dark" || (t === "system" && systemPrefersDark);

    root.classList.remove("light", "dark");
    if (isDark) {
      root.classList.add("dark");
      setResolvedTheme("dark");
    } else {
      root.classList.add("light");
      setResolvedTheme("light");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
    setThemeState(stored);
    applyTheme(stored);

    // Dynamic listener for OS preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => {
      const currentStored = (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
      if (currentStored === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, [applyTheme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      localStorage.setItem(STORAGE_KEY, newTheme);
      applyTheme(newTheme);
    },
    [applyTheme],
  );

  const cycleTheme = useCallback(() => {
    setTheme(
      theme === "system" ? "light" : theme === "light" ? "dark" : "system",
    );
  }, [theme, setTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    cycleTheme,
    toggleTheme,
    isDark: resolvedTheme === "dark",
  };
}
