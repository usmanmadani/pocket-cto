import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Play,
  Monitor,
  Code2,
  Database,
  GitBranch,
  FolderGit2,
  Download,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  RefreshCw,
  Layers,
  Wand2,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Plus,
  Terminal,
  FileCode2,
  CheckCircle2,
  FileText,
  Send,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LivePreviewSandbox } from "@/components/LivePreviewSandbox";
import { LivePreviewPane } from "@/components/LivePreviewPane";
import { MonacoCodeEditor } from "@/components/MonacoCodeEditor";
import { UserFlowCanvas } from "@/components/UserFlowCanvas";
import { GitControlBar } from "@/components/GitControlBar";
import { GitPRModal } from "@/components/GitPRModal";
import { NewRepoModal } from "@/components/NewRepoModal";
import { GitHubSyncModal } from "@/components/GitHubSyncModal";
import { ProjectSettingsModal, getStoredIntegrations, type ProjectIntegrations } from "@/components/ProjectSettingsModal";
import { ThoughtStream } from "@/components/ThoughtStream";
import { streamPost, parseFiles, type BlueprintFile, type UserFlowData, type CodebaseContext } from "@/lib/architect-client";
import { downloadPackage } from "@/lib/blueprint-store";

interface LovableStudioBuilderProps {
  files: BlueprintFile[];
  onUpdateFile?: ((fileName: string, newContent: string) => void) | undefined;
  userFlow?: UserFlowData | null | undefined;
  ideaTitle: string;
  domain?: string | undefined;
  repoFullName?: string | undefined;
  codebaseContext?: CodebaseContext | null | undefined;
}

export function LovableStudioBuilder({
  files: initialFiles,
  onUpdateFile,
  userFlow,
  ideaTitle,
  domain = "SaaS Platform",
  repoFullName,
  codebaseContext,
}: LovableStudioBuilderProps) {
  const [files, setFiles] = useState<BlueprintFile[]>(initialFiles);
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "userflow" | "database">("preview");
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [promptInput, setPromptInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [thoughts, setThoughts] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{
      id: string;
      role: "user" | "assistant";
      text: string;
      tasks?: string[];
      filesChanged?: string[];
      migrationSql?: string | undefined;
    }>
  >([
    {
      id: "init",
      role: "assistant",
      text: repoFullName
        ? `I've loaded **${repoFullName}** (${files.length} files). Tell me what changes, new pages, or bug fixes you'd like me to build!`
        : `I've initialized the architecture and workspace for **${ideaTitle}**. Tell me what you'd like to build next!`,
    },
  ]);

  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  const [prModalOpen, setPrModalOpen] = useState(false);
  const [newRepoModalOpen, setNewRepoModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [integrations, setIntegrations] = useState<ProjectIntegrations>(getStoredIntegrations());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [copiedMigration, setCopiedMigration] = useState(false);

  const activeFile = files[Math.min(activeFileIndex, Math.max(files.length - 1, 0))];

  // Extract SQL migrations and schemas
  const sqlFiles = useMemo(() => {
    return files.filter(
      (f) =>
        f.name.toLowerCase().endsWith(".sql") ||
        f.name.toLowerCase().includes("schema") ||
        f.name.toLowerCase().includes("migration"),
    );
  }, [files]);

  const latestMigration = sqlFiles[0]?.content || "";

  const handleDeployToVercel = async () => {
    setIsDeploying(true);
    try {
      const res = await fetch("/api/deploy/vercel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: ideaTitle,
          generatedFiles: files.map((f) => ({ path: f.name, content: f.content })),
          sqlMigrations: sqlFiles.map((s) => s.content),
          supabaseCredentials: integrations.supabaseUrl
            ? {
                supabaseUrl: integrations.supabaseUrl,
                anonKey: integrations.supabaseAnonKey,
              }
            : undefined,
          vercelToken: integrations.vercelToken,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setSettingsModalOpen(true);
        setChatHistory((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            text: `⚠️ Deployment Notice: ${data.error}. Please ensure your Vercel Token is configured in Settings.`,
          },
        ]);
      } else if (data.previewUrl) {
        setPreviewUrl(data.previewUrl);
        setChatHistory((prev) => [
          ...prev,
          {
            id: `deploy-${Date.now()}`,
            role: "assistant",
            text: `🚀 **Live Vercel Preview Deployed!**\nPreview URL: [${data.previewUrl}](${data.previewUrl})\n${
              data.databaseReady ? "✅ Connected to your custom Supabase database." : ""
            }`,
          },
        ]);
      }
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: `⚠️ Deployment error: ${err?.message || String(err)}`,
        },
      ]);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleFileChange = (name: string, content: string) => {
    const updated = files.map((f) => (f.name === name ? { ...f, content } : f));
    setFiles(updated);
    if (onUpdateFile) onUpdateFile(name, content);
  };

  // Submit AI Prompt (Lovable / Bolt conversational build loop)
  const handleSendPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim() || busy) return;

    const userMessage = promptInput.trim();
    setPromptInput("");
    setBusy(true);
    setThoughts("");

    const newMsgId = Date.now().toString();
    setChatHistory((prev) => [
      ...prev,
      { id: `user-${newMsgId}`, role: "user", text: userMessage },
    ]);

    try {
      // 1. Generate Implementation Plan
      let planJson = "";
      await streamPost(
        "/api/agent/plan",
        {
          iterationPrompt: userMessage,
          currentFiles: files,
          userFlow,
          codebaseContext: repoFullName ? { repoName: repoFullName } : undefined,
          blueprintSummary: `${ideaTitle} (${domain})`,
        },
        (event) => {
          if (event.type === "thought") setThoughts((t) => t + event.value);
          else if (event.type === "text") planJson += event.value;
        },
      );

      let parsedPlan = {
        title: "Feature Update",
        summary: "Applying requested architectural changes",
        tasks: ["Updating components", "Generating migrations"],
        affected_files: [] as { path: string; action: string; purpose: string }[],
      };

      try {
        parsedPlan = JSON.parse(planJson);
      } catch {
        /* fallback */
      }

      // 2. Execute Code Generation
      let codeStream = "";
      await streamPost(
        "/api/agent/code",
        {
          approvedPlan: parsedPlan,
          iterationPrompt: userMessage,
          existingFiles: files,
          userFlow,
          codebaseContext: repoFullName ? { repoName: repoFullName } : undefined,
        },
        (event) => {
          if (event.type === "thought") setThoughts((t) => t + event.value);
          else if (event.type === "text") codeStream += event.value;
        },
      );

      const generated = parseFiles(codeStream);
      if (generated.length > 0) {
        const fileMap = new Map<string, string>();
        files.forEach((f) => fileMap.set(f.name, f.content));
        generated.forEach((g) => fileMap.set(g.name, g.content));

        // Generate incremental SQL migration if schema changed
        const newSql = generated.find((g) => g.name.toLowerCase().endsWith(".sql"));
        let migrationSql: string | undefined;

        if (newSql) {
          const timestamp = new Date()
            .toISOString()
            .replace(/[-:T.Z]/g, "")
            .slice(0, 14);
          const migrationFileName = `supabase/migrations/${timestamp}_update_schema.sql`;
          fileMap.set(migrationFileName, newSql.content);
          migrationSql = newSql.content;
        }

        const merged: BlueprintFile[] = Array.from(fileMap.entries()).map(([name, content]) => ({
          name,
          content,
        }));

        setFiles(merged);
        if (onUpdateFile) {
          merged.forEach((f) => onUpdateFile(f.name, f.content));
        }

        setChatHistory((prev) => [
          ...prev,
          {
            id: `assistant-${newMsgId}`,
            role: "assistant",
            text: `Successfully built: **${parsedPlan.title}**\n${parsedPlan.summary}`,
            tasks: parsedPlan.tasks,
            filesChanged: generated.map((g) => g.name),
            migrationSql,
          },
        ]);
      }
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          id: `assistant-err-${newMsgId}`,
          role: "assistant",
          text: `⚠️ Encountered an issue while building: ${String(err)}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const copyMigrationSql = (sql: string) => {
    void navigator.clipboard.writeText(sql);
    setCopiedMigration(true);
    setTimeout(() => setCopiedMigration(false), 2000);
  };

  return (
    <div className="flex h-[88vh] min-h-[680px] flex-col rounded-2xl border border-border/80 bg-[#070b14] overflow-hidden shadow-2xl">
      {/* Top Lovable-style Studio Header */}
      <header className="flex flex-wrap items-center justify-between border-b border-border/80 bg-[#080d1a] px-4 py-2.5 text-xs text-foreground">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-display font-semibold text-foreground">
            <span className="flex size-6 items-center justify-center rounded-lg bg-teal-500 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20">
              ⚡
            </span>
            <span className="truncate max-w-[200px]">{ideaTitle}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-border/60 bg-background/50 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
            <FolderGit2 className="size-3 text-teal-400" />
            {repoFullName ? (
              <span className="text-foreground">{repoFullName}</span>
            ) : (
              <span>No Git linked</span>
            )}
          </div>
        </div>

        {/* View Switcher Tabs (Bolt / Lovable style) */}
        <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-background/60 p-0.5">
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-xs transition-all ${
              activeTab === "preview"
                ? "bg-primary/20 text-primary font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="size-3.5" /> Preview
          </button>

          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-xs transition-all ${
              activeTab === "code"
                ? "bg-primary/20 text-primary font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="size-3.5" /> Code ({files.length})
          </button>

          {userFlow && (
            <button
              onClick={() => setActiveTab("userflow")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-xs transition-all ${
                activeTab === "userflow"
                  ? "bg-purple-500/20 text-purple-400 font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GitBranch className="size-3.5" /> User Flow
            </button>
          )}

          <button
            onClick={() => setActiveTab("database")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-xs transition-all ${
              activeTab === "database"
                ? "bg-cyan-500/20 text-cyan-400 font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Database className="size-3.5" /> Database & Migrations
          </button>
        </div>

        {/* Right Top Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsModalOpen(true)}
            className="h-7 gap-1.5 font-mono text-xs border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
            title="Configure your Supabase Database credentials (BYOK) and Vercel Token"
          >
            <ShieldCheck className="size-3 text-cyan-400" />
            {integrations.supabaseUrl ? "Supabase Connected" : "Connect Supabase / Vercel"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewRepoModalOpen(true)}
            className="h-7 gap-1.5 font-mono text-xs border-border/80 text-foreground hover:bg-background/80"
          >
            <FolderGit2 className="size-3 text-teal-400" />
            {repoFullName ? "Export to New Repo" : "Create GitHub Repo"}
          </Button>

          <Button
            size="sm"
            onClick={() =>
              downloadPackage(files, ideaTitle, {
                idea: ideaTitle,
                domain,
                answers: [],
                userFlow: userFlow || undefined,
              })
            }
            className="h-7 gap-1.5 bg-primary font-mono text-xs text-primary-foreground shadow-md hover:opacity-95"
          >
            <Download className="size-3" /> Export .zip
          </Button>
        </div>
      </header>

      {/* Main Split Studio Area: Left Chat/Agent + Right Interactive Canvas */}
      <div className="grid flex-1 grid-cols-12 overflow-hidden">
        {/* Left Side: Lovable-style AI Chat & Task Stream */}
        <aside className="col-span-12 md:col-span-4 border-r border-border/80 bg-[#060913] flex flex-col justify-between overflow-hidden">
          {/* Chat / Thought Stream Logs */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3 text-primary" /> Pocket CTO Agent
              </span>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ● Live Agent
              </span>
            </div>

            {busy && <ThoughtStream text={thoughts} active={busy} />}

            {/* Message Feed */}
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl p-3.5 text-xs leading-relaxed transition-all ${
                  msg.role === "user"
                    ? "bg-primary/15 border border-primary/30 text-foreground ml-4"
                    : "bg-background/60 border border-border/70 text-slate-300 mr-2"
                }`}
              >
                <div className="font-mono text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  {msg.role === "user" ? "You" : "Pocket CTO AI"}
                </div>
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Tasks completed */}
                {msg.tasks && msg.tasks.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-border/50 space-y-1">
                    <div className="font-mono text-[10px] font-semibold text-primary uppercase">
                      Executed Steps:
                    </div>
                    {msg.tasks.map((task, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="size-3 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{task}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Files Changed */}
                {msg.filesChanged && msg.filesChanged.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.filesChanged.map((f) => (
                      <span
                        key={f}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-border/50 font-mono text-[10px] text-teal-400"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                {/* Migration notification pill */}
                {msg.migrationSql && (
                  <div className="mt-2 p-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300">
                      <Database className="size-3" /> Incremental SQL Migration Ready
                    </div>
                    <button
                      onClick={() => copyMigrationSql(msg.migrationSql!)}
                      className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      {copiedMigration ? <Check className="size-3" /> : <Copy className="size-3" />}
                      {copiedMigration ? "Copied" : "Copy SQL"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Chat Prompt Box */}
          <div className="p-3 border-t border-border/80 bg-[#070b14] space-y-2">
            {/* Quick action chips */}
            <div className="flex flex-wrap gap-1">
              {[
                "Add Stripe billing",
                "Add user auth & RLS",
                "Add dark/light theme",
                "Add data export",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setPromptInput(chip)}
                  className="px-2 py-0.5 rounded-full border border-border/60 bg-background/40 font-mono text-[10px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  + {chip}
                </button>
              ))}
            </div>

            <form onSubmit={handleSendPrompt} className="relative flex items-center">
              <Input
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Ask Pocket CTO to build, add screens, or change code..."
                disabled={busy}
                className="pr-10 h-10 font-mono text-xs bg-background/60 border-border/80 text-foreground"
              />
              <Button
                type="submit"
                size="icon"
                disabled={busy || !promptInput.trim()}
                className="absolute right-1 size-8 bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              </Button>
            </form>
          </div>
        </aside>

        {/* Right Side: Tabbed Canvas (Preview, Code, User Flow, Database) */}
        <main className="col-span-12 md:col-span-8 flex flex-col bg-[#090d16] overflow-hidden">
          {/* VIEW 1: INTERACTIVE LIVE PREVIEW */}
          {activeTab === "preview" && (
            <div className="flex-1 p-3 overflow-hidden">
              <LivePreviewPane
                previewUrl={previewUrl}
                isDeploying={isDeploying}
                onDeployToVercel={handleDeployToVercel}
                supabaseConnected={Boolean(integrations.supabaseUrl)}
                onOpenSettings={() => setSettingsModalOpen(true)}
              />
            </div>
          )}

          {/* VIEW 2: MONACO CODE EDITOR */}
          {activeTab === "code" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* File selection bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/70 bg-[#070a12] px-3 py-1.5">
                {files.map((file, i) => (
                  <button
                    key={file.name}
                    onClick={() => setActiveFileIndex(i)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-xs whitespace-nowrap transition-all ${
                      i === activeFileIndex
                        ? "bg-primary/20 text-primary font-semibold border border-primary/30"
                        : "text-muted-foreground hover:bg-slate-900/60 hover:text-foreground"
                    }`}
                  >
                    <FileCode2 className="size-3 text-teal-400" />
                    <span>{file.name}</span>
                  </button>
                ))}
              </div>

              {activeFile && (
                <div className="flex-1 h-full">
                  <MonacoCodeEditor
                    fileName={activeFile.name}
                    value={activeFile.content}
                    onChange={(newVal) => handleFileChange(activeFile.name, newVal)}
                  />
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: USER FLOW DIAGRAM CANVAS */}
          {activeTab === "userflow" && userFlow && (
            <div className="flex-1 p-3 overflow-auto">
              <UserFlowCanvas data={userFlow} />
            </div>
          )}

          {/* VIEW 4: DATABASE & MIGRATIONS MANAGER */}
          {activeTab === "database" && (
            <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
              <div className="rounded-xl border border-border/80 bg-background/50 p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground">
                    External Database & Supabase Migrations
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Copy and run these SQL DDL migrations in your Supabase SQL Editor or PostgreSQL instance.
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => copyMigrationSql(latestMigration)}
                  className="gap-1.5 font-mono text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30"
                >
                  {copiedMigration ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copiedMigration ? "Copied SQL" : "Copy SQL for Supabase"}
                </Button>
              </div>

              <div className="flex-1 rounded-xl border border-border/80 bg-[#060913] p-4 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="font-mono text-xs font-semibold text-cyan-400">
                    Latest Schema DDL & RLS Policies
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {sqlFiles.length} migration files available
                  </span>
                </div>

                <div className="flex-1 pt-3 overflow-hidden">
                  <MonacoCodeEditor
                    fileName="DATABASE_SCHEMA.sql"
                    value={latestMigration || "-- No SQL migration generated yet."}
                    readOnly
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <ProjectSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        onSaved={(cfg) => setIntegrations(cfg)}
      />

      <NewRepoModal
        open={newRepoModalOpen}
        onOpenChange={setNewRepoModalOpen}
        files={files}
        defaultName={ideaTitle.slice(0, 24)}
      />

      <GitPRModal
        open={prModalOpen}
        onOpenChange={setPrModalOpen}
        repoFullName={repoFullName}
      />

      <GitHubSyncModal
        open={syncModalOpen}
        onOpenChange={setSyncModalOpen}
      />
    </div>
  );
}
