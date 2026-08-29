import React, { useState, useMemo } from "react";
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  Sun,
  Moon,
  User,
  Shield,
  Layers,
  Sparkles,
  ExternalLink,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BlueprintFile, UserFlowData } from "@/lib/architect-client";

interface LivePreviewSandboxProps {
  files: BlueprintFile[];
  userFlow?: UserFlowData | null;
  ideaTitle?: string;
  domain?: string;
}

export function LivePreviewSandbox({
  files,
  userFlow,
  ideaTitle = "Application Dashboard",
  domain = "SaaS Platform",
}: LivePreviewSandboxProps) {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewTheme, setPreviewTheme] = useState<"dark" | "light">("dark");
  const [activeRole, setActiveRole] = useState<"Admin" | "Member" | "Manager">("Admin");
  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  // Extract navigation items from User Flow or Default
  const navItems = useMemo(() => {
    if (userFlow?.branches && userFlow.branches.length > 0) {
      return ["Dashboard", ...userFlow.branches.map((b) => b.name)];
    }
    return ["Dashboard", "Analytics", "Settings", "Users"];
  }, [userFlow]);

  // Extract tables from SQL file if available
  const schemaTables = useMemo(() => {
    const sqlFile = files.find((f) => f.name.toLowerCase().includes(".sql") || f.name.toLowerCase().includes("schema"));
    if (!sqlFile) return ["users", "records", "transactions", "audit_logs"];
    const matches = Array.from(sqlFile.content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/gi));
    return matches.map((m) => m[1]).slice(0, 5);
  }, [files]);

  // Build the complete HTML sandbox source for the iframe
  const iframeSource = useMemo(() => {
    const isDark = previewTheme === "dark";
    const bgClass = isDark ? "bg-[#090d16] text-slate-100" : "bg-slate-50 text-slate-900";
    const cardBg = isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm";
    const subText = isDark ? "text-slate-400" : "text-slate-500";
    const headerBorder = isDark ? "border-slate-800" : "border-slate-200";

    return `<!DOCTYPE html>
<html class="${isDark ? "dark" : ""}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body className="${bgClass} min-h-screen transition-colors duration-200">
  <div className="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside className="w-60 shrink-0 border-r ${headerBorder} p-4 flex flex-col justify-between ${isDark ? "bg-[#070a12]" : "bg-slate-100/70"}">
      <div className="space-y-6">
        <div className="flex items-center gap-2.5 px-2">
          <div className="size-7 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-bold text-sm shadow-md shadow-teal-500/20">
            ⚡
          </div>
          <div>
            <div className="font-bold text-xs tracking-tight truncate max-w-[140px]">${ideaTitle.slice(0, 20)}</div>
            <div className="text-[10px] font-mono ${subText}">${domain}</div>
          </div>
        </div>

        <nav className="space-y-1">
          ${navItems
            .map(
              (item) => `
            <button onclick="parent.postMessage({type: 'NAV_CLICK', tab: '${item}'}, '*')" 
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                item === activeTab
                  ? "bg-teal-500/10 text-teal-400 font-semibold border border-teal-500/20"
                  : `${subText} hover:bg-slate-800/40 hover:text-slate-200`
              }">
              <span>📁</span>
              <span className="truncate">${item}</span>
            </button>`,
            )
            .join("")}
        </nav>
      </div>

      <!-- User footer -->
      <div className="border-t ${headerBorder} pt-3 flex items-center gap-2.5 px-2">
        <div className="size-7 rounded-full bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center text-xs font-bold font-mono">
          ${activeRole[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium truncate">${activeRole} Account</div>
          <div className="text-[9px] font-mono ${subText} truncate">live-sandbox@pocketcto.dev</div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main className="flex-1 flex flex-col overflow-y-auto">
      <!-- Top Bar -->
      <header className="h-14 border-b ${headerBorder} px-6 flex items-center justify-between shrink-0 ${isDark ? "bg-[#090d16]/80" : "bg-white/80"} backdrop-blur-md">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold">${activeTab}</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            ● Live Environment
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-teal-500 text-slate-950 font-semibold text-xs shadow-md shadow-teal-500/20 hover:opacity-95 transition-all">
            + New Record
          </button>
        </div>
      </header>

      <!-- Dashboard Grid -->
      <div className="p-6 space-y-6">
        <!-- Stat Cards -->
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border ${cardBg}">
            <div className="text-xs ${subText}">Total Activity</div>
            <div className="text-2xl font-bold mt-1">24,582</div>
            <div className="text-[11px] text-emerald-400 mt-1 font-mono">↑ 18.2% this week</div>
          </div>
          <div className="p-4 rounded-xl border ${cardBg}">
            <div className="text-xs ${subText}">Active Schemas</div>
            <div className="text-2xl font-bold mt-1">${schemaTables.length || 4} Tables</div>
            <div className="text-[11px] text-teal-400 mt-1 font-mono">RLS Protected</div>
          </div>
          <div className="p-4 rounded-xl border ${cardBg}">
            <div className="text-xs ${subText}">Avg Latency</div>
            <div className="text-2xl font-bold mt-1">32ms</div>
            <div className="text-[11px] text-emerald-400 mt-1 font-mono">Edge Optimized</div>
          </div>
          <div className="p-4 rounded-xl border ${cardBg}">
            <div className="text-xs ${subText}">System Status</div>
            <div className="text-2xl font-bold mt-1 text-emerald-400">Operational</div>
            <div className="text-[11px] ${subText} mt-1 font-mono">99.99% SLA</div>
          </div>
        </div>

        <!-- Data Table Mockup -->
        <div className="rounded-xl border ${cardBg} overflow-hidden">
          <div className="p-4 border-b ${headerBorder} flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider ${subText}">Database Table Explorer (${schemaTables[0] || "records"})</h3>
            <span className="text-[10px] font-mono ${subText}">Showing 5 sample records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="${isDark ? "bg-slate-900" : "bg-slate-100"} font-mono text-[10px] ${subText}">
                <tr>
                  <th className="py-2.5 px-4">UUID</th>
                  <th className="py-2.5 px-4">NAME / IDENTIFIER</th>
                  <th className="py-2.5 px-4">STATUS</th>
                  <th className="py-2.5 px-4">UPDATED AT</th>
                  <th className="py-2.5 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y ${headerBorder}">
                ${[1, 2, 3, 4]
                  .map(
                    (i) => `
                <tr className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] ${subText}">usr_01j7${i}a89c...</td>
                  <td className="py-3 px-4 font-medium">Production Record #${i}</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">ACTIVE</span></td>
                  <td className="py-3 px-4 font-mono text-[11px] ${subText}">Just now</td>
                  <td className="py-3 px-4 text-right"><button className="text-teal-400 hover:underline font-mono text-[11px]">Inspect →</button></td>
                </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>
</body>
</html>`;
  }, [previewTheme, activeRole, activeTab, ideaTitle, domain, navItems, schemaTables, refreshKey]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-[#070a12] overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border/80 bg-background/80 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-border bg-background/60 p-0.5">
            <Button
              variant={viewport === "desktop" ? "secondary" : "ghost"}
              size="icon"
              className="size-7"
              onClick={() => setViewport("desktop")}
              title="Desktop View (100%)"
            >
              <Monitor className="size-3.5" />
            </Button>
            <Button
              variant={viewport === "tablet" ? "secondary" : "ghost"}
              size="icon"
              className="size-7"
              onClick={() => setViewport("tablet")}
              title="Tablet View (768px)"
            >
              <Tablet className="size-3.5" />
            </Button>
            <Button
              variant={viewport === "mobile" ? "secondary" : "ghost"}
              size="icon"
              className="size-7"
              onClick={() => setViewport("mobile")}
              title="Mobile View (375px)"
            >
              <Smartphone className="size-3.5" />
            </Button>
          </div>

          <div className="hidden sm:flex items-center gap-1 font-mono text-xs text-muted-foreground">
            <span className="text-primary font-semibold">
              {viewport === "desktop" ? "100%" : viewport === "tablet" ? "768px" : "375px"}
            </span>
          </div>
        </div>

        {/* State Simulation Controls */}
        <div className="flex items-center gap-2">
          {/* Role Simulation Switcher */}
          <div className="flex items-center rounded-lg border border-border bg-background/50 p-0.5">
            {(["Admin", "Manager", "Member"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setActiveRole(r)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                  activeRole === r
                    ? "bg-primary/20 text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() =>
              setPreviewTheme((t) => (t === "dark" ? "light" : "dark"))
            }
            title="Toggle Sandbox Theme"
          >
            {previewTheme === "dark" ? (
              <Sun className="size-3.5 text-amber-400" />
            ) : (
              <Moon className="size-3.5 text-blue-400" />
            )}
          </Button>

          {/* Refresh Sandbox */}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setRefreshKey((k) => k + 1)}
            title="Reload Sandbox"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 overflow-auto p-4 flex justify-center items-start bg-[#050811]">
        <div
          style={{
            width:
              viewport === "desktop"
                ? "100%"
                : viewport === "tablet"
                  ? "768px"
                  : "375px",
            height: "640px",
          }}
          className="rounded-xl border border-border/80 shadow-2xl overflow-hidden transition-all duration-300 bg-background"
        >
          <iframe
            key={refreshKey}
            srcDoc={iframeSource}
            title="Component Execution Sandbox"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
