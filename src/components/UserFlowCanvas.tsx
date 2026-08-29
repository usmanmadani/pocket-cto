import React, { useRef, useState, useMemo } from "react";
import {
  toPng,
} from "html-to-image";
import * as LucideIcons from "lucide-react";
import {
  Download,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Sparkles,
  Layers,
  ArrowDown,
  ArrowRight,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserFlowData, UserFlowBranch } from "@/lib/architect-client";

interface UserFlowCanvasProps {
  data: UserFlowData;
  onImageGenerated?: (dataUrl: string) => void;
}

// Dynamic Icon Component safely resolving any Lucide Icon name
function DynamicIcon({
  name,
  className = "size-4",
}: {
  name: string;
  className?: string;
}) {
  const IconComponent = (
    LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ className?: string }>
    >
  )[name];

  if (!IconComponent) {
    return <LucideIcons.Circle className={className} />;
  }

  return <IconComponent className={className} />;
}

// Color theme helper
function getColorTheme(color: string) {
  switch (color?.toLowerCase()) {
    case "purple":
      return {
        border: "border-purple-500/40 hover:border-purple-400",
        bg: "bg-purple-500/10",
        text: "text-purple-400",
        glow: "shadow-purple-500/20",
        badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        line: "#a855f7",
      };
    case "blue":
      return {
        border: "border-blue-500/40 hover:border-blue-400",
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        glow: "shadow-blue-500/20",
        badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        line: "#3b82f6",
      };
    case "green":
    case "emerald":
      return {
        border: "border-emerald-500/40 hover:border-emerald-400",
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        glow: "shadow-emerald-500/20",
        badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        line: "#10b981",
      };
    case "amber":
    case "yellow":
    case "orange":
      return {
        border: "border-amber-500/40 hover:border-amber-400",
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        glow: "shadow-amber-500/20",
        badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        line: "#f59e0b",
      };
    case "cyan":
      return {
        border: "border-cyan-500/40 hover:border-cyan-400",
        bg: "bg-cyan-500/10",
        text: "text-cyan-400",
        glow: "shadow-cyan-500/20",
        badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        line: "#06b6d4",
      };
    case "rose":
    case "red":
      return {
        border: "border-rose-500/40 hover:border-rose-400",
        bg: "bg-rose-500/10",
        text: "text-rose-400",
        glow: "shadow-rose-500/20",
        badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        line: "#f43f5e",
      };
    default:
      return {
        border: "border-primary/40 hover:border-primary",
        bg: "bg-primary/10",
        text: "text-primary",
        glow: "shadow-primary/20",
        badge: "bg-primary/20 text-primary border-primary/30",
        line: "#14b8a6",
      };
  }
}

export function UserFlowCanvas({ data, onImageGenerated }: UserFlowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  const handleExportPNG = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      // Allow DOM to settle, reset zoom transform temporarily for crisp screenshot
      const currentZoom = zoom;
      setZoom(1);
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(canvasRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: "#090d16",
        style: {
          transform: "scale(1)",
        },
      });

      setZoom(currentZoom);

      // Download file
      const link = document.createElement("a");
      link.download = `${(data.title || "user-flow")
        .toLowerCase()
        .replace(/\W+/g, "-")}-diagram.png`;
      link.href = dataUrl;
      link.click();

      if (onImageGenerated) {
        onImageGenerated(dataUrl);
      }
    } catch (err) {
      console.error("Failed to export flow diagram PNG:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className={`relative flex flex-col rounded-xl border border-border bg-[#070b14] overflow-hidden transition-all ${
        fullscreen ? "fixed inset-4 z-50 shadow-2xl" : "min-h-[650px] w-full"
      }`}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border/80 bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <GitBranch className="size-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">
              {data.title || "User Flow Navigation Hierarchy"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {data.subtitle || "End-to-end user navigation & decision paths"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center rounded-lg border border-border bg-background/50 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
              title="Zoom Out"
            >
              <ZoomOut className="size-3.5" />
            </Button>
            <span className="px-2 font-mono text-[11px] text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              title="Zoom In"
            >
              <ZoomIn className="size-3.5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setFullscreen(!fullscreen)}
            title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {fullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>

          <Button
            size="sm"
            onClick={handleExportPNG}
            disabled={exporting}
            className="gap-2 bg-gradient-to-r from-primary to-teal-500 font-mono text-xs text-primary-foreground shadow-lg hover:opacity-90"
          >
            {exporting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Export Flow PNG
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto p-6 md:p-10 flex justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
        <div
          ref={canvasRef}
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
          className="w-full max-w-5xl space-y-10 p-8 rounded-2xl bg-[#090d16] border border-border/40 transition-transform duration-200"
        >
          {/* 1. ENTRY & AUTH DECISION TREE */}
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center gap-3">
              {/* Start Node */}
              <div className="rounded-full border border-primary/40 bg-primary/20 px-4 py-1.5 font-mono text-xs font-semibold text-primary uppercase tracking-widest shadow-lg shadow-primary/10">
                {data.entry.start || "START"}
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
              {/* Splash Screen */}
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card/80 px-4 py-2 text-left shadow-md">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <DynamicIcon name={data.entry.splash.icon || "Smartphone"} />
                </div>
                <div>
                  <div className="text-xs font-semibold">
                    {data.entry.splash.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {data.entry.splash.subtitle}
                  </div>
                </div>
              </div>
            </div>

            {/* Down Connector */}
            <div className="flex flex-col items-center">
              <div className="h-6 w-px bg-border" />
              <ArrowDown className="size-3.5 text-muted-foreground -mt-1" />
            </div>

            {/* Decision Diamond */}
            <div className="relative flex flex-col items-center justify-center rounded-xl border border-amber-500/50 bg-amber-500/10 px-6 py-3 text-center shadow-lg shadow-amber-500/10">
              <span className="font-mono text-[10px] font-semibold text-amber-400 uppercase tracking-widest">
                DECISION
              </span>
              <h4 className="text-xs font-bold text-foreground">
                {data.entry.decision.title || "Authentication"}
              </h4>
              <p className="text-[10px] text-muted-foreground">
                {data.entry.decision.subtitle || "New or returning user?"}
              </p>
            </div>

            {/* Auth Branches */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
              {data.entry.auth_routes.map((route, i) => {
                const theme = getColorTheme(route.color || "blue");
                return (
                  <div
                    key={i}
                    className={`relative flex items-center gap-3 rounded-xl border ${theme.border} ${theme.bg} p-3.5 transition-all shadow-md`}
                  >
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${theme.border} bg-background/60 ${theme.text}`}
                    >
                      <DynamicIcon name={route.icon || "LogIn"} />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold truncate">
                          {route.title}
                        </span>
                        <span
                          className={`font-mono text-[9px] uppercase px-1.5 py-0.2 rounded border ${theme.badge}`}
                        >
                          {route.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {route.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Merging into Home Hub */}
            <div className="flex flex-col items-center">
              <div className="h-8 w-px bg-gradient-to-b from-border to-primary" />
              <ArrowDown className="size-4 text-primary -mt-1" />
            </div>
          </div>

          {/* 2. CENTRAL HOME / DASHBOARD HUB */}
          <div className="flex flex-col items-center">
            <div className="group relative flex items-center gap-4 rounded-2xl border-2 border-primary bg-primary/10 px-8 py-4 text-center shadow-xl shadow-primary/20 backdrop-blur-md">
              <div className="absolute -inset-1 -z-10 rounded-2xl bg-primary/20 blur-md transition-all group-hover:bg-primary/30" />
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                <DynamicIcon
                  name={data.hub.icon || "Home"}
                  className="size-6"
                />
              </div>
              <div className="text-left">
                <span className="font-mono text-[10px] font-bold text-primary uppercase tracking-widest">
                  CENTRAL HUB
                </span>
                <h3 className="font-display text-base font-bold text-foreground">
                  {data.hub.title || "Dashboard Home"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {data.hub.subtitle || "Main Navigation Gateway"}
                </p>
              </div>
            </div>

            {/* Radiating branches connector */}
            <div className="mt-4 flex flex-col items-center">
              <div className="h-6 w-px bg-primary/50" />
              <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground uppercase">
                <Layers className="size-3" /> Core Feature Branches
              </div>
              <div className="h-4 w-px bg-border" />
            </div>
          </div>

          {/* 3. CORE FEATURE BRANCHES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {data.branches.map((branch, bi) => {
              const theme = getColorTheme(branch.color);
              return (
                <div
                  key={bi}
                  className={`flex flex-col rounded-2xl border ${theme.border} bg-card/60 p-4 transition-all hover:bg-card/90 shadow-lg ${theme.glow}`}
                >
                  {/* Branch Header */}
                  <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex size-8 items-center justify-center rounded-lg border ${theme.border} ${theme.bg} ${theme.text}`}
                      >
                        <DynamicIcon
                          name={branch.icon || "Folder"}
                          className="size-4"
                        />
                      </div>
                      <div>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                          Branch {bi + 1}
                        </span>
                        <h4 className="text-xs font-bold text-foreground">
                          {branch.name}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Step Nodes */}
                  <div className="flex-1 space-y-3">
                    {branch.steps.map((step, si) => (
                      <div key={si} className="relative flex items-start gap-2.5">
                        {/* Vertical line connecting steps */}
                        {si < branch.steps.length - 1 && (
                          <div className="absolute left-3.5 top-7 h-6 w-px bg-border/60" />
                        )}
                        <div
                          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-mono transition-colors ${
                            step.highlight
                              ? `${theme.border} bg-primary/20 text-primary font-bold shadow-sm`
                              : "border-border bg-background/80 text-muted-foreground"
                          }`}
                        >
                          {step.highlight ? (
                            <Sparkles className="size-3 text-primary animate-pulse" />
                          ) : (
                            si + 1
                          )}
                        </div>
                        <div
                          className={`flex-1 rounded-xl border p-2.5 text-left transition-all ${
                            step.highlight
                              ? `border-primary/50 bg-primary/10 ring-1 ring-primary/30 shadow-md`
                              : "border-border/60 bg-background/40 hover:border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-medium text-foreground">
                              {step.title}
                            </span>
                            <div className="text-muted-foreground shrink-0">
                              <DynamicIcon
                                name={step.icon || "FileText"}
                                className="size-3"
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                            {step.subtitle}
                          </p>
                          {step.highlight && (
                            <span className="mt-1.5 inline-flex items-center gap-1 font-mono text-[9px] text-primary">
                              <CheckCircle2 className="size-2.5" /> Key Action /
                              Goal
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
