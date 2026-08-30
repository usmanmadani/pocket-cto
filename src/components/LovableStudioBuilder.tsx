import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Mic,
  MicOff,
  Radio,
  HelpCircle,
  Lightbulb,
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
import { ExportRulesModal } from "@/components/ExportRulesModal";
import { streamPost, parseFiles, type BlueprintFile, type UserFlowData, type CodebaseContext } from "@/lib/architect-client";
import { downloadPackage, saveStudioChat, getStudioChat, type StudioChatMessage } from "@/lib/blueprint-store";

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
  domain,
  repoFullName,
  codebaseContext,
}: LovableStudioBuilderProps) {
  const [files, setFiles] = useState<BlueprintFile[]>(initialFiles);
  const [originalFiles, setOriginalFiles] = useState<BlueprintFile[]>(initialFiles);
  const [codeViewMode, setCodeViewMode] = useState<"editor" | "diff">("editor");
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "userflow" | "database">("code");
  const [promptInput, setPromptInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [thoughts, setThoughts] = useState("");
  const [copiedMigration, setCopiedMigration] = useState(false);
  const [exportRulesModalOpen, setExportRulesModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [newRepoModalOpen, setNewRepoModalOpen] = useState(false);
  const [prModalOpen, setPrModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  // Integrations state
  const [integrations, setIntegrations] = useState<ProjectIntegrations>(getStoredIntegrations());

  // Vercel deployment preview URL
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  // Studio Chat History with persistence
  const [chatHistory, setChatHistory] = useState<StudioChatMessage[]>(() => {
    const stored = getStudioChat(ideaTitle);
    if (stored && stored.length > 0) return stored;

    return [
      {
        id: "init-1",
        role: "assistant",
        text: `👋 **Welcome to Pocket CTO Studio!** I have loaded your workspace for **"${ideaTitle}"**.\n\nI have full autonomous read/write access to all your project files and database schemas. You can ask me to modify code, build new pages, integrate payment gateways, or refactor components. What should we build next?`,
      },
    ];
  });

  // Sync initialFiles if prop updates
  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  // Persist chat whenever updated
  useEffect(() => {
    if (chatHistory.length > 0) {
      saveStudioChat(ideaTitle, chatHistory);
    }
  }, [chatHistory, ideaTitle]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, thoughts, busy]);

  const activeFile = files[activeFileIndex] || files[0];
  const originalFile = originalFiles.find((f) => f.name === activeFile?.name) || activeFile;

  // Extract SQL migration files
  const sqlFiles = useMemo(() => {
    return files.filter((f) => f.name.toLowerCase().endsWith(".sql"));
  }, [files]);

  const latestMigration = sqlFiles.length > 0 ? sqlFiles[sqlFiles.length - 1]?.content : "";

  // Speech-to-text voice recognition handler
  const toggleVoiceRecording = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setPromptInput((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition error:", err);
      setIsListening(false);
    }
  };

  const copyMigrationSql = (sqlText: string) => {
    if (!sqlText) return;
    navigator.clipboard.writeText(sqlText);
    setCopiedMigration(true);
    setTimeout(() => setCopiedMigration(false), 2500);
  };

  const handleDeployToVercel = async () => {
    setIsDeploying(true);
    try {
      const res = await fetch("/api/deploy/vercel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: ideaTitle.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 32),
          files,
          supabaseConfig: integrations.supabaseUrl
            ? {
                url: integrations.supabaseUrl,
                anonKey: integrations.supabaseAnonKey,
              }
            : undefined,
          customVercelToken: integrations.vercelToken || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
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

  // Submit AI Prompt (Autonomous Conversational Coding Agent)
  const handleSendPrompt = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const userMessage = (overrideText ?? promptInput).trim();
    if (!userMessage || busy) return;

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      setIsListening(false);
    }

    setPromptInput("");
    setBusy(true);
    setThoughts("");

    const newMsgId = Date.now().toString();
    const updatedHistory: StudioChatMessage[] = [
      ...chatHistory,
      { id: `user-${newMsgId}`, role: "user", text: userMessage },
    ];
    setChatHistory(updatedHistory);

    try {
      let assistantResponse = "";
      await streamPost(
        "/api/agent/chat",
        {
          message: userMessage,
          chatHistory: updatedHistory.map((m) => ({ role: m.role, text: m.text })),
          files,
          ideaTitle,
          domain,
          codebaseContext: repoFullName ? { repoName: repoFullName } : undefined,
          userFlow,
        },
        (event) => {
          if (event.type === "thought") setThoughts((t) => t + event.value);
          else if (event.type === "text") assistantResponse += event.value;
        },
      );

      // Extract modified or newly generated files from the stream
      const generated = parseFiles(assistantResponse);
      const changedFileNames: string[] = [];

      if (generated.length > 0) {
        // Save current files as baseline for Git diff view
        setOriginalFiles([...files]);

        const fileMap = new Map<string, string>();
        files.forEach((f) => fileMap.set(f.name, f.content));
        generated.forEach((g) => {
          fileMap.set(g.name, g.content);
          changedFileNames.push(g.name);
        });

        // Check for incremental SQL migration
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

        // Auto-select the first modified file
        if (changedFileNames.length > 0) {
          const idx = merged.findIndex((f) => f.name === changedFileNames[0]);
          if (idx !== -1) setActiveFileIndex(idx);
        }

        // Clean conversational text (strip file delimiters for clean chat bubble)
        const cleanExplanation = assistantResponse
          .replace(/===FILE:\s*[\s\S]*?(?====FILE:|$)/g, "")
          .trim();

        setChatHistory((prev) => [
          ...prev,
          {
            id: `assistant-${newMsgId}`,
            role: "assistant",
            text: cleanExplanation || `✅ Successfully updated ${changedFileNames.length} file(s) across your project.`,
            filesChanged: changedFileNames,
            migrationSql,
          },
        ]);
      } else {
        // Conversational response without code changes
        setChatHistory((prev) => [
          ...prev,
          {
            id: `assistant-${newMsgId}`,
            role: "assistant",
            text: assistantResponse || "I have analyzed your request and workspace.",
          },
        ]);
      }
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        {
          id: `assistant-${newMsgId}`,
          role: "assistant",
          text: `⚠️ Request notice: ${err?.message || "Generation completed."}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  // Helper to parse interactive decision options from assistant text
  const parseOptionsFromText = (text: string) => {
    const options: Array<{ title: string; desc: string }> = [];
    const regex = /\[OPTION:\s*([^\|\]]+)(?:\|\s*([^\]]+))?\]/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      options.push({
        title: match[1]?.trim() || "Option",
        desc: match[2]?.trim() || "",
      });
    }
    return options;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[920px] rounded-2xl border border-border/80 bg-[#070b14] overflow-hidden shadow-2xl">
      {/* Top Studio Control Bar */}
      <GitControlBar
        files={files}
        ideaTitle={ideaTitle}
        domain={domain}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenNewRepo={() => setNewRepoModalOpen(true)}
        onOpenPR={() => setPrModalOpen(true)}
        onOpenSync={() => setSyncModalOpen(true)}
        onOpenExportRules={() => setExportRulesModalOpen(true)}
        onDeployToVercel={handleDeployToVercel}
        isDeploying={isDeploying}
        repoFullName={repoFullName}
        supabaseConfigured={Boolean(integrations.supabaseUrl)}
      />

      {/* Main Studio Body: 2-Column Split */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Side: Dynamic Conversational AI Engineer Panel */}
        <aside className="col-span-12 md:col-span-4 border-r border-border/80 bg-[#060913] flex flex-col overflow-hidden">
          {/* Panel Header */}
          <div className="p-3.5 border-b border-border/80 bg-[#080d1a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-teal-500 text-slate-950 font-bold text-xs shadow-md">
                ⚡
              </span>
              <div>
                <h3 className="font-display text-xs font-bold text-foreground flex items-center gap-1.5">
                  Pocket CTO Agent
                  <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Autonomous Codebase Modifications & Full History
                </p>
              </div>
            </div>

            {repoFullName && (
              <span className="font-mono text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30 truncate max-w-[130px]">
                {repoFullName}
              </span>
            )}
          </div>

          {/* Thought stream indicator */}
          {busy && <ThoughtStream text={thoughts} active={busy} />}

          {/* Chat Messages Log */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg) => {
              const options = msg.role === "assistant" ? parseOptionsFromText(msg.text) : [];
              const cleanText = msg.text.replace(/\[OPTION:\s*[^\]]+\]/gi, "").trim();

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground font-medium rounded-tr-none shadow-md"
                        : "bg-[#0c1224] border border-border/80 text-foreground font-normal rounded-tl-none shadow-lg"
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans">{cleanText}</div>

                    {/* Interactive Decision Options (Option A vs Option B) */}
                    {options.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-border/60 space-y-2">
                        <span className="font-mono text-[10px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                          <Lightbulb className="size-3" /> Recommended Architectural Choices:
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {options.map((opt, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSendPrompt(undefined, `I choose: ${opt.title}. Please implement this approach across the codebase.`)}
                              disabled={busy}
                              className="text-left p-2 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 transition-all font-mono text-[11px] text-primary group"
                            >
                              <div className="font-bold flex items-center justify-between">
                                <span>👉 {opt.title}</span>
                                <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              {opt.desc && (
                                <p className="text-[10px] text-muted-foreground font-sans mt-0.5">
                                  {opt.desc}
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Files Changed Badge */}
                    {msg.filesChanged && msg.filesChanged.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-border/60">
                        <span className="font-mono text-[10px] text-muted-foreground block mb-1">
                          Modified / Created Files:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {msg.filesChanged.map((f) => (
                            <button
                              key={f}
                              onClick={() => {
                                const idx = files.findIndex((file) => file.name === f);
                                if (idx !== -1) {
                                  setActiveFileIndex(idx);
                                  setActiveTab("code");
                                }
                              }}
                              className="px-2 py-0.5 rounded-md bg-slate-900 border border-teal-500/40 font-mono text-[10px] text-teal-300 hover:border-teal-400 hover:bg-teal-500/10 transition-all flex items-center gap-1"
                            >
                              <FileCode2 className="size-2.5 text-teal-400" /> {f}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Incremental SQL Migration Pill */}
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
                </div>
              );
            })}
          </div>

          {/* Bottom Chat Prompt & Voice Box */}
          <div className="p-3 border-t border-border/80 bg-[#070b14] space-y-2.5">
            {/* Quick 1-Click AI Recommendation Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { label: "🔐 Add Supabase Email & Google Auth", prompt: "Add Supabase user authentication with email sign-in, Google OAuth, and secure Row-Level Security (RLS) user tables." },
                { label: "💳 Add Stripe Billing & Pricing Tiers", prompt: "Add Stripe checkout integration, subscription pricing tiers, and billing customer portal." },
                { label: "📊 Add Real-Time Analytics Dashboard", prompt: "Add an interactive analytics dashboard with charts, KPI summary cards, and time-range filters." },
                { label: "🔍 Add Global Command Bar (Cmd+K)", prompt: "Add a global Cmd+K quick search modal with keyboard navigation to jump between pages and actions." },
                { label: "🌙 Add Dark / Light Mode Toggle", prompt: "Add high-contrast dark and white theme toggle switch with persistent local preference." },
                { label: "⚡ Add Automated Vitest Tests", prompt: "Synthesize automated unit tests and validation suites for all critical components and schemas." },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setPromptInput(chip.prompt)}
                  className="px-2.5 py-1 rounded-lg border border-border/70 bg-background/50 font-mono text-[10px] font-medium text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/10 transition-all whitespace-nowrap shrink-0 shadow-sm"
                  title={`Click to fill: "${chip.prompt}"`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Speech recording banner */}
            {isListening && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 font-mono text-xs animate-pulse">
                <span className="flex items-center gap-2">
                  <Radio className="size-3.5 text-rose-400 animate-spin" /> Listening... Speak now to transcribe
                </span>
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className="text-[10px] font-bold uppercase underline"
                >
                  Stop Mic
                </button>
              </div>
            )}

            <form onSubmit={(e) => handleSendPrompt(e)} className="relative flex items-center gap-1.5">
              <Input
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Ask Pocket CTO to build, add screens, or change code..."
                disabled={busy}
                className="pr-20 h-10 font-mono text-xs bg-background/60 border-border/80 text-foreground"
              />

              <div className="absolute right-1 flex items-center gap-1">
                {/* Voice speech-to-text mic button */}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={toggleVoiceRecording}
                  title={isListening ? "Stop voice recording" : "Start voice speech-to-text"}
                  className={`size-8 transition-colors ${
                    isListening
                      ? "text-rose-400 bg-rose-500/20 hover:bg-rose-500/30"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                  }`}
                >
                  {isListening ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                </Button>

                {/* Submit button */}
                <Button
                  type="submit"
                  size="icon"
                  disabled={busy || !promptInput.trim()}
                  className="size-8 bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                </Button>
              </div>
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

          {/* VIEW 2: MONACO CODE EDITOR WITH VISUAL GIT DIFF */}
          {activeTab === "code" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* File selection and Diff Mode bar */}
              <div className="flex items-center justify-between border-b border-border/70 bg-[#070a12] px-3 py-1.5 gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto">
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

                {/* Visual Editor vs Git Diff Switcher */}
                <div className="flex items-center gap-1 shrink-0 bg-background/60 p-0.5 rounded-lg border border-border/70">
                  <button
                    onClick={() => setCodeViewMode("editor")}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded font-mono text-[11px] transition-all ${
                      codeViewMode === "editor"
                        ? "bg-primary/20 text-primary font-bold shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Code2 className="size-3" /> Editor
                  </button>
                  <button
                    onClick={() => setCodeViewMode("diff")}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded font-mono text-[11px] transition-all ${
                      codeViewMode === "diff"
                        ? "bg-teal-500/20 text-teal-300 font-bold shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Side-by-side Git Diff view of changes (+ additions / - deletions)"
                  >
                    <Sparkles className="size-3 text-teal-400" /> Visual Git Diff
                  </button>
                </div>
              </div>

              {activeFile && (
                <div className="flex-1 h-full">
                  <MonacoCodeEditor
                    fileName={activeFile.name}
                    value={activeFile.content}
                    originalValue={originalFile?.content || activeFile.content}
                    isDiff={codeViewMode === "diff"}
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
      <ExportRulesModal
        open={exportRulesModalOpen}
        onOpenChange={setExportRulesModalOpen}
        files={files}
        ideaTitle={ideaTitle}
        domain={domain}
        userFlow={userFlow}
      />

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
