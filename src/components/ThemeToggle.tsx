import React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, cycleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className={`size-8 font-mono text-xs rounded-lg text-muted-foreground hover:text-foreground transition-all ${
        className || ""
      }`}
      title={
        theme === "system"
          ? `Theme: System Default (${resolvedTheme}) — Click for Light Mode`
          : theme === "light"
            ? "Theme: Light (White Mode) — Click for Dark Mode"
            : "Theme: Dark (Night Mode) — Click for System Default"
      }
    >
      {theme === "system" ? (
        <Laptop className="size-4 text-primary transition-transform hover:scale-110" />
      ) : theme === "light" ? (
        <Sun className="size-4 text-amber-500 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-teal-400 transition-transform hover:-rotate-12" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
