import React, { useState } from "react";
import {
  ExternalLink,
  RefreshCw,
  Smartphone,
  Tablet,
  Monitor,
  Rocket,
  ShieldCheck,
  Zap,
  Globe,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LivePreviewPaneProps {
  previewUrl: string | null;
  isDeploying: boolean;
  onDeployToVercel?: () => void;
  supabaseConnected?: boolean;
  onOpenSettings?: () => void;
}

export const LivePreviewPane: React.FC<LivePreviewPaneProps> = ({
  previewUrl,
  isDeploying,
  onDeployToVercel,
  supabaseConnected = false,
  onOpenSettings,
}) => {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [refreshKey, setRefreshKey] = useState(0);

  const viewportWidths = {
    desktop: "w-full",
    tablet: "w-[768px] max-w-full",
    mobile: "w-[375px] max-w-full",
  };

  return (
    <div className="flex flex-col h-full bg-[#080d1a] border border-border/80 rounded-xl overflow-hidden shadow-2xl">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#0b1224] border-b border-border/80 gap-2">
        <div className="flex items-center space-x-2">
          <div className="size-2.5 rounded-full bg-red-500/80" />
          <div className="size-2.5 rounded-full bg-yellow-500/80" />
          <div className="size-2.5 rounded-full bg-emerald-500/80" />
          <span className="text-xs text-muted-foreground font-mono ml-2 flex items-center gap-1.5">
            <Globe className="size-3 text-teal-400" /> Live Vercel Preview
          </span>

          {supabaseConnected && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              <ShieldCheck className="size-3 text-cyan-400" /> Supabase Bound
            </span>
          )}
        </div>

        {/* Viewport Toggles */}
        <div className="flex items-center space-x-1 bg-background/60 p-1 rounded-lg border border-border/80">
          <button
            onClick={() => setViewport("desktop")}
            className={`p-1.5 rounded transition-all ${
              viewport === "desktop"
                ? "bg-primary/20 text-primary font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Desktop View (100%)"
          >
            <Monitor className="size-3.5" />
          </button>
          <button
            onClick={() => setViewport("tablet")}
            className={`p-1.5 rounded transition-all ${
              viewport === "tablet"
                ? "bg-primary/20 text-primary font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Tablet View (768px)"
          >
            <Tablet className="size-3.5" />
          </button>
          <button
            onClick={() => setViewport("mobile")}
            className={`p-1.5 rounded transition-all ${
              viewport === "mobile"
                ? "bg-primary/20 text-primary font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Mobile View (375px)"
          >
            <Smartphone className="size-3.5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {previewUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setRefreshKey((k) => k + 1)}
              title="Refresh Preview"
            >
              <RefreshCw className="size-3.5 text-muted-foreground hover:text-foreground" />
            </Button>
          )}

          {onDeployToVercel && (
            <Button
              size="sm"
              onClick={onDeployToVercel}
              disabled={isDeploying}
              className="h-7 gap-1.5 bg-gradient-to-r from-primary to-teal-500 font-mono text-xs text-primary-foreground shadow-md hover:opacity-95"
            >
              {isDeploying ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Rocket className="size-3" />
              )}
              {previewUrl ? "Re-Deploy Live" : "Deploy to Vercel"}
            </Button>
          )}

          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center text-xs text-teal-400 hover:text-teal-300 font-mono bg-teal-500/10 px-2.5 py-1 rounded border border-teal-500/20 shadow-sm"
            >
              Open Live <ExternalLink className="ml-1 size-3" />
            </a>
          )}
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 bg-[#060a14] flex items-center justify-center p-3 sm:p-4 overflow-hidden relative">
        {isDeploying ? (
          <div className="flex flex-col items-center justify-center space-y-3 p-8 text-center">
            <RefreshCw className="size-8 text-primary animate-spin" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">
                Building & Deploying to Vercel...
              </h4>
              <p className="text-xs text-muted-foreground font-mono">
                Injecting Supabase ENV variables and generating edge preview bundle
              </p>
            </div>
          </div>
        ) : previewUrl ? (
          <div className={`h-full ${viewportWidths[viewport]} transition-all duration-300 flex flex-col`}>
            <iframe
              key={refreshKey}
              src={previewUrl}
              title="Pocket CTO Live Preview"
              className="w-full h-full rounded-lg border border-border/80 shadow-2xl bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3 p-8 text-center max-w-md">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-lg">
              <Rocket className="size-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">
                Live Cloud Deployment & Sandbox
              </h4>
              <p className="text-xs text-muted-foreground">
                Deploy your generated software directly to Vercel with integrated Supabase database credentials to test live auth, APIs, and screens.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {onDeployToVercel && (
                <Button
                  onClick={onDeployToVercel}
                  className="gap-1.5 bg-primary font-mono text-xs text-primary-foreground shadow-md hover:opacity-90"
                >
                  <Rocket className="size-3.5" /> Deploy Live Preview
                </Button>
              )}
              {onOpenSettings && (
                <Button
                  variant="outline"
                  onClick={onOpenSettings}
                  className="gap-1.5 font-mono text-xs border-border text-foreground hover:bg-background/80"
                >
                  <ShieldCheck className="size-3.5 text-cyan-400" /> Configure Supabase
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
