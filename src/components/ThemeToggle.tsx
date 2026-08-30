import React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={`size-8 font-mono text-xs rounded-lg text-muted-foreground hover:text-foreground ${className || ""}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? (
        <Sun className="size-4 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-teal-600 transition-transform hover:-rotate-12" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
