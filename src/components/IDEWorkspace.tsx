import React, { useState, useMemo, useEffect } from "react";
import {
  FileCode2,
  FileText,
  Database,
  FolderGit2,
  GitBranch,
  Copy,
  Download,
  Check,
  Search,
  Maximize2,
  Minimize2,
  AlertTriangle,
  ShieldAlert,
  Info,
  Sparkles,
  Loader2,
  ChevronRight,
  ChevronDown,
  Play,
  Monitor,
  CheckCircle2,
  Terminal,
  Layers,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitControlBar } from "@/components/GitControlBar";
import { GitPRModal } from "@/components/GitPRModal";
import { LivePreviewSandbox } from "@/components/LivePreviewSandbox";
import { UserFlowCanvas } from "@/components/UserFlowCanvas";
import {
  analyzeDeliverables,
  type DiagnosticIssue,
} from "@/lib/diagnostics-engine";
import { streamPost, type BlueprintFile, type UserFlowData } from "@/lib/architect-client";
import { downloadPackage } from "@/lib/blueprint-store";

interface IDEWorkspaceProps {
  files: BlueprintFile[];
  onUpdateFile?: ((fileName: string, newContent: string) => void) | undefined;
  userFlow?: UserFlowData | null | undefined;
  ideaTitle: string;
  domain?: string | undefined;
  repoFullName?: string | undefined;
  onOpenSyncModal: () => void;
}

export function IDEWorkspace({
  files: initialFiles,
  onUpdateFile,
  userFlow,
  ideaTitle,
  domain = "SaaS Platform",
  repoFullName,
  onOpenSyncModal,
}: IDEWorkspaceProps) {
  const [files, setFiles] = useState<BlueprintFile[]>(initialFiles);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"editor" | "preview" | "userflow">("editor");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [prModalOpen, setPrModalOpen] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(true);
  const [fixingIssueId, setFixingIssueId] = useState<string | null>(null);
  const [fixLog, setFixLog] = useState<string>("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");

  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  const activeFile = files[Math.min(activeFileIndex, Math.max(files.length - 1, 0))];

  // Run real-time diagnostics
  const diagnostics = useMemo(() => {
    return analyzeDeliverables(files);
  }, [files]);

  const filteredDiagnostics = useMemo(() => {
    if (selectedSeverity === "all") return diagnostics;
    return diagnostics.filter((d) => d.severity === selectedSeverity);
  }, [diagnostics, selectedSeverity]);

  const counts = useMemo(() => {
    return {
      errors: diagnostics.filter((d) => d.severity === "error").length,
      security: diagnostics.filter((d) => d.severity === "security").length,
      warnings: diagnostics.filter((d) => d.severity === "warning").length,
      suggestions: diagnostics.filter((d) => d.severity === "suggestion").length,
    };
  }, [diagnostics]);

  const handleCopyCode = () => {
    if (!activeFile) return;
    void navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1-Click AI Fix Handler
  const handleFixWithAI = async (issue: DiagnosticIssue) => {
    const targetFile = files.find((f) => f.name === issue.file);
    if (!targetFile) return;

    setFixingIssueId(issue.id);
    setFixLog(`Initiating AI fix sub-agent for rule: ${issue.rule}...`);

    try {
      let patchedContent = "";
      await streamPost(
        "/api/diagnostics/fix",
        {
          fileName: targetFile.name,
          fileContent: targetFile.content,
          issueTitle: issue.title,
          issueDescription: issue.description,
          issueSuggestion: issue.suggestion,
        },
        (event) => {
          if (event.type === "thought") {
            setFixLog((prev) => prev + "\n" + event.value);
          } else if (event.type === "text") {
            patchedContent += event.value;
          }
        },
      );

      if (patchedContent.trim().length > 20) {
        const updated = files.map((f) =>
          f.name === targetFile.name ? { ...f, content: patchedContent.trim() } : f,
        );
        setFiles(updated);
        if (onUpdateFile) {
          onUpdateFile(targetFile.name, patchedContent.trim());
        }
        setFixLog((prev) => prev + `\n✔ Successfully patched ${targetFile.name}!`);
      }
    } catch (err) {
      setFixLog((prev) => prev + `\n❌ Fix failed: ${String(err)}`);
    } finally {
      setTimeout(() => setFixingIssueId(null), 1500);
    }
  };

  // File Icon helper
  const getFileIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.endsWith(".sql") || lower.includes("schema")) {
      return <Database className="size-3.5 text-cyan-400" />;
    }
    if (lower.endsWith(".json")) {
      return <FileCode2 className="size-3.5 text-amber-400" />;
    }
    if (lower.includes("prompt")) {
      return <Sparkles className="size-3.5 text-purple-400" />;
    }
    return <FileText className="size-3.5 text-blue-400" />;
  };

  // Filtered code lines for search
  const lines = useMemo(() => {
    if (!activeFile) return [];
    return activeFile.content.split("\n");
  }, [activeFile]);

  return (
    <div className="flex flex-col rounded-xl border border-border/80 bg-[#070b14] overflow-hidden shadow-2xl">
      {/* 1. Git Control Suite Header */}
      <GitControlBar
        repoFullName={repoFullName}
        files={files}
        onOpenSyncModal={onOpenSyncModal}
        onOpenPRModal={() => setPrModalOpen(true)}
        autoSync={autoSync}
        onAutoSyncChange={setAutoSync}
      />

      {/* 2. Main Workspace Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
        {/* Left Sidebar: File Explorer */}
        <aside className="col-span-12 md:col-span-3 border-r border-border/70 bg-[#050811] p-3 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Project Explorer
              </span>
              <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-background/50 border border-border/40">
                {files.length} artifacts
              </span>
            </div>

            {/* File List */}
            <div className="space-y-1">
              {files.map((file, i) => {
                const isSelected = i === activeFileIndex && activeTab === "editor";
                return (
                  <button
                    key={file.name}
                    onClick={() => {
                      setActiveFileIndex(i);
                      setActiveTab("editor");
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left font-mono text-xs transition-all ${
                      isSelected
                        ? "bg-primary/15 text-primary font-semibold border border-primary/30"
                        : "text-muted-foreground hover:bg-slate-900/60 hover:text-foreground border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      {getFileIcon(file.name)}
                      <span className="truncate">{file.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0 font-mono">
                      {Math.round(file.content.length / 1024)}kb
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Stats in Sidebar */}
          <div className="pt-3 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>Security & Schema:</span>
              <span
                className={`font-semibold ${
                  counts.security + counts.errors === 0
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {counts.security + counts.errors === 0
                  ? "✓ Verified"
                  : `${counts.security + counts.errors} issues`}
              </span>
            </div>
          </div>
        </aside>

        {/* Center / Right Editor & Views */}
        <main className="col-span-12 md:col-span-9 flex flex-col bg-[#090d16]">
          {/* Editor Header / View Switcher Tabs */}
          <div className="flex flex-wrap items-center justify-between border-b border-border/70 bg-[#070a12] px-4 py-2">
            {/* View Mode Buttons */}
            <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-background/50 p-0.5">
              <Button
                variant={activeTab === "editor" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs font-mono gap-1.5"
                onClick={() => setActiveTab("editor")}
              >
                <FileCode2 className="size-3.5" /> Code View
              </Button>
              <Button
                variant={activeTab === "preview" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs font-mono gap-1.5"
                onClick={() => setActiveTab("preview")}
              >
                <Monitor className="size-3.5 text-teal-400" /> Live Preview
              </Button>
              {userFlow && (
                <Button
                  variant={activeTab === "userflow" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs font-mono gap-1.5"
                  onClick={() => setActiveTab("userflow")}
                >
                  <GitBranch className="size-3.5 text-purple-400" /> User Flow
                </Button>
              )}
            </div>

            {/* Quick Actions */}
            {activeTab === "editor" && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="size-3.5 absolute left-2.5 top-2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find in file..."
                    className="h-7 w-36 pl-8 font-mono text-[11px] bg-background/50 border-border/70"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="h-7 gap-1.5 font-mono text-xs"
                >
                  {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            )}
          </div>

          {/* Tab Views */}
          <div className="flex-1 overflow-auto">
            {/* View 1: Code Editor View */}
            {activeTab === "editor" && activeFile && (
              <div className="flex h-full min-h-[460px] font-mono text-xs leading-relaxed">
                {/* Line Numbers Column */}
                <div className="w-12 select-none border-r border-border/50 bg-[#060913] py-4 text-right pr-3 text-muted-foreground/40 space-y-0.5">
                  {lines.map((_, i) => (
                    <div key={i} className="text-[11px] h-5 leading-5">
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Code Content Area */}
                <div className="flex-1 p-4 overflow-x-auto text-slate-200 selection:bg-primary/30">
                  <pre className="text-[12px] leading-5 whitespace-pre-wrap">
                    {searchQuery
                      ? lines
                          .filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase()))
                          .join("\n")
                      : activeFile.content}
                  </pre>
                </div>
              </div>
            )}

            {/* View 2: Live Preview View */}
            {activeTab === "preview" && (
              <div className="h-full p-3">
                <LivePreviewSandbox
                  files={files}
                  userFlow={userFlow}
                  ideaTitle={ideaTitle}
                  domain={domain}
                />
              </div>
            )}

            {/* View 3: User Flow Diagram View */}
            {activeTab === "userflow" && userFlow && (
              <div className="h-full p-3">
                <UserFlowCanvas data={userFlow} />
              </div>
            )}
          </div>

          {/* 3. Bottom Drawer: AI Diagnostics & Schema Linter */}
          <div className="border-t border-border/80 bg-[#050811]">
            <div className="flex items-center justify-between px-4 py-2 bg-background/40">
              <button
                onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
                className="flex items-center gap-2 font-mono text-xs font-semibold text-foreground hover:text-primary transition-colors"
              >
                <Terminal className="size-3.5 text-primary" />
                <span>Issues & Diagnostics</span>
                <div className="flex items-center gap-1.5 ml-2">
                  {counts.security > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px]">
                      {counts.security} Security
                    </span>
                  )}
                  {counts.warnings > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px]">
                      {counts.warnings} Warnings
                    </span>
                  )}
                  {counts.security === 0 && counts.warnings === 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                      ✓ 0 Errors
                    </span>
                  )}
                </div>
                {diagnosticsOpen ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
              </button>

              {diagnosticsOpen && (
                <div className="flex items-center gap-1">
                  {(["all", "security", "warning", "suggestion"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSeverity(s)}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase transition-colors ${
                        selectedSeverity === s
                          ? "bg-primary/20 text-primary font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Diagnostics Content */}
            {diagnosticsOpen && (
              <div className="max-h-48 overflow-y-auto p-3 space-y-2 border-t border-border/40">
                {fixingIssueId && fixLog && (
                  <div className="p-3 rounded-lg border border-primary/40 bg-primary/10 text-xs font-mono text-primary space-y-1">
                    <div className="flex items-center gap-2 font-bold">
                      <Loader2 className="size-3.5 animate-spin" />
                      Auto-Fixing issue with AI Subagent...
                    </div>
                    <pre className="text-[11px] whitespace-pre-wrap opacity-90">{fixLog}</pre>
                  </div>
                )}

                {filteredDiagnostics.length === 0 ? (
                  <div className="py-4 text-center text-xs font-mono text-emerald-400 flex items-center justify-center gap-2">
                    <CheckCircle2 className="size-4" />
                    All schema rules, RLS policies, and architectural standards validated.
                  </div>
                ) : (
                  filteredDiagnostics.map((issue) => (
                    <div
                      key={issue.id}
                      className="flex flex-wrap items-start justify-between gap-2 p-2.5 rounded-lg border border-border/60 bg-background/50 hover:bg-background/80 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {issue.severity === "security" ? (
                          <ShieldAlert className="size-4 text-rose-400 shrink-0 mt-0.5" />
                        ) : issue.severity === "warning" ? (
                          <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="size-4 text-blue-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {issue.title}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.2 rounded bg-slate-900 border border-border/40">
                              {issue.file} {issue.line ? `:${issue.line}` : ""}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {issue.description}
                          </p>
                        </div>
                      </div>

                      {issue.fixAvailable && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleFixWithAI(issue)}
                          disabled={fixingIssueId === issue.id}
                          className="h-7 text-xs font-mono gap-1 text-primary hover:bg-primary/20"
                        >
                          {fixingIssueId === issue.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Wand2 className="size-3" />
                          )}
                          Fix with AI
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* PR Modal Dialog */}
      <GitPRModal
        open={prModalOpen}
        onOpenChange={setPrModalOpen}
        repoFullName={repoFullName}
        defaultTitle={`feat(spec): automated Pocket CTO blueprint specifications for ${ideaTitle.slice(0, 30)}`}
      />
    </div>
  );
}
