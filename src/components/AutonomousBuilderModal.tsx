import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Wand2,
  Loader2,
  FileCode2,
  Layers,
  ArrowRight,
  GitBranch,
  FolderGit2,
  Plus,
  RefreshCw,
  Edit3,
  Check,
  AlertCircle,
  ShieldCheck,
  Globe,
  Database,
  Cpu,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { streamPost, parseFiles, type BlueprintFile, type UserFlowData, type CodebaseContext } from "@/lib/architect-client";
import { ThoughtStream } from "@/components/ThoughtStream";
import { NewRepoModal } from "@/components/NewRepoModal";

export type ImplementationPlan = {
  title: string;
  summary: string;
  tasks: string[];
  affected_files: { path: string; action: string; purpose: string }[];
  architectural_decisions: string[];
};

interface AutonomousBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: BlueprintFile[];
  onFilesUpdated: (newFiles: BlueprintFile[]) => void;
  userFlow?: UserFlowData | null | undefined;
  codebaseContext?: CodebaseContext | null | undefined;
  repoFullName?: string | undefined;
  ideaTitle: string;
  domain?: string | undefined;
}

export function AutonomousBuilderModal({
  open,
  onOpenChange,
  files,
  onFilesUpdated,
  userFlow,
  codebaseContext,
  repoFullName,
  ideaTitle,
  domain,
}: AutonomousBuilderModalProps) {
  const [iterationPrompt, setIterationPrompt] = useState("");
  const [phase, setPhase] = useState<"input" | "planning" | "review_plan" | "coding" | "completed">("input");
  const [plan, setPlan] = useState<ImplementationPlan | null>(null);
  const [thoughts, setThoughts] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customFeedback, setCustomFeedback] = useState("");
  const [newRepoModalOpen, setNewRepoModalOpen] = useState(false);

  const effectiveRepo = repoFullName || codebaseContext?.repoName;

  // 1. Generate Implementation Plan (Phase 2)
  const handleGeneratePlan = async (promptText = iterationPrompt) => {
    const textToUse =
      promptText.trim() ||
      `Synthesize and build the entire full-stack software system for "${ideaTitle}", including every page route in the User Flow Navigation Tree, database schema models, and interactive API endpoints without omitting any screen.`;

    setBusy(true);
    setError(null);
    setThoughts("");
    setPhase("planning");

    let planJson = "";
    try {
      await streamPost(
        "/api/agent/plan",
        {
          iterationPrompt: textToUse,
          currentFiles: files,
          userFlow,
          codebaseContext: effectiveRepo
            ? {
                repoName: effectiveRepo,
                fileTree: codebaseContext?.fileTree,
              }
            : undefined,
          blueprintSummary: `${ideaTitle} (${domain || "Software System"})`,
        },
        (e) => {
          if (e.type === "thought") setThoughts((t) => t + e.value);
          else if (e.type === "text") planJson += e.value;
          else if (e.type === "error") setError(e.value);
        },
      );

      const parsed = JSON.parse(planJson) as ImplementationPlan;
      setPlan(parsed);
      setPhase("review_plan");
    } catch (err) {
      setError("Failed to synthesize plan. Please check Gemini API key.");
    } finally {
      setBusy(false);
    }
  };

  // 2. Execute Code (Phase 3)
  const handleExecuteCode = async () => {
    if (!plan) return;
    setBusy(true);
    setError(null);
    setThoughts("");
    setPhase("coding");

    let codeStream = "";
    try {
      await streamPost(
        "/api/agent/code",
        {
          approvedPlan: plan,
          iterationPrompt,
          existingFiles: files,
          userFlow,
          codebaseContext: effectiveRepo ? { repoName: effectiveRepo } : undefined,
        },
        (e) => {
          if (e.type === "thought") setThoughts((t) => t + e.value);
          else if (e.type === "text") codeStream += e.value;
          else if (e.type === "error") setError(e.value);
        },
      );

      const generated = parseFiles(codeStream);
      if (generated.length > 0) {
        // Merge generated files with existing
        const fileMap = new Map<string, string>();
        files.forEach((f) => fileMap.set(f.name, f.content));
        generated.forEach((g) => fileMap.set(g.name, g.content));

        const merged: BlueprintFile[] = Array.from(fileMap.entries()).map(([name, content]) => ({
          name,
          content,
        }));

        onFilesUpdated(merged);
        setPhase("completed");
      } else {
        throw new Error("No files were produced during code execution.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-[760px] max-h-[90vh] overflow-y-auto border-border bg-[#080d1a] p-4 sm:p-6 text-foreground shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="size-5" />
              <DialogTitle className="text-base sm:text-lg font-display font-semibold">
                Pocket CTO AI — Autonomous Software Builder
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Build your entire system end-to-end or iterate on existing code with deep pre-inspection, plan review, and direct GitHub deployment.
            </DialogDescription>
          </DialogHeader>

          {effectiveRepo && (
            <div className="flex items-center gap-2 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs font-mono text-teal-400">
              <ShieldCheck className="size-4 shrink-0" />
              <span>
                Connected to <strong>{effectiveRepo}</strong> — Non-destructive pre-inspection & design matching active.
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Real-time thought stream indicator */}
          {busy && <ThoughtStream text={thoughts} active={busy} />}

          {/* STEP 1: PROMPT & INTENT INPUT */}
          {phase === "input" && (
            <div className="space-y-4 py-2">
              {/* Primary 1-Click "Build Entire System" Card */}
              <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/15 via-teal-500/10 to-transparent p-4 transition-all hover:border-primary">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
                        ⚡
                      </span>
                      <h4 className="text-sm font-bold text-foreground">
                        Build Entire Application with All Screens
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Automatically maps every route, modal, layout, and domain branch in your <strong>User Flow Diagram</strong> ({userFlow?.branches?.length || 4} modules) into full, production-ready code.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleGeneratePlan("Build the entire system with all screens, pages, and components mapped in the User Flow Navigation tree.")}
                    disabled={busy}
                    className="shrink-0 gap-1.5 bg-primary font-mono text-xs font-semibold text-primary-foreground shadow-md hover:opacity-95"
                  >
                    <Wand2 className="size-3.5" /> Build Entire System
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Or specify custom iteration / feature to build:
                </label>
                <Textarea
                  value={iterationPrompt}
                  onChange={(e) => setIterationPrompt(e.target.value)}
                  placeholder="e.g. Implement Stripe subscription checkout, webhook handlers, customer billing portal, and Supabase RLS policies..."
                  className="font-mono text-xs min-h-24 bg-background/50 border-border/80"
                  rows={3}
                />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-muted-foreground">
                  Popular Iterations:
                </span>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {[
                    "Stripe billing & recurring subscriptions",
                    "Role-Based Access Control (RBAC) & permissions",
                    "PostgreSQL full-text search API",
                    "Email notification dispatch with Resend",
                    "Audit log & activity tracking stream",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setIterationPrompt(chip)}
                      className="rounded-full border border-border/70 bg-background/40 px-2.5 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => handleGeneratePlan()}
                  disabled={busy || !iterationPrompt.trim()}
                  className="gap-2 bg-primary font-mono text-xs text-primary-foreground shadow-md"
                >
                  <Wand2 className="size-3.5" />
                  Synthesize Implementation Plan
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: REVIEWABLE IMPLEMENTATION PLAN (Phase 2) */}
          {phase === "review_plan" && plan && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase font-bold text-primary tracking-wider">
                    Phase 2: Reviewable Implementation Plan
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Awaiting Approval
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-foreground mt-1">
                  {plan.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {plan.summary}
                </p>
              </div>

              {/* Task Checklist */}
              <div className="rounded-xl border border-border/80 bg-background/40 p-4 space-y-2">
                <h4 className="font-mono text-xs font-semibold text-foreground uppercase tracking-wider">
                  Planned Tasks Checklist ({plan.tasks.length} items)
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {plan.tasks.map((task, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{task}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Affected Files */}
              <div className="rounded-xl border border-border/80 bg-background/40 p-4 space-y-2">
                <h4 className="font-mono text-xs font-semibold text-foreground uppercase tracking-wider">
                  Target Files & Diffs ({plan.affected_files.length} files)
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {plan.affected_files.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/50 bg-background/60 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`px-1.5 py-0.2 text-[9px] rounded font-bold uppercase shrink-0 ${
                            file.action.toLowerCase() === "create"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : file.action.toLowerCase() === "delete"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          }`}
                        >
                          {file.action}
                        </span>
                        <span className="font-medium text-foreground truncate">{file.path}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                        {file.purpose}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tweak Plan custom input */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <Input
                    value={customFeedback}
                    onChange={(e) => setCustomFeedback(e.target.value)}
                    placeholder="Tweak plan instructions (e.g. 'Add Prisma schema and Dockerfile')..."
                    className="font-mono text-xs h-9 bg-background/50"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 font-mono text-xs gap-1 shrink-0"
                    disabled={!customFeedback.trim() || busy}
                    onClick={() => {
                      handleGeneratePlan(`${iterationPrompt} (Adjustment: ${customFeedback})`);
                      setCustomFeedback("");
                    }}
                  >
                    <Edit3 className="size-3" /> Tweak Plan
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-border/80">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPhase("input")}
                >
                  Back to Prompt
                </Button>

                <div className="flex gap-2">
                  <Button
                    onClick={handleExecuteCode}
                    disabled={busy}
                    className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 font-mono text-xs text-slate-950 font-bold shadow-lg hover:opacity-95"
                  >
                    <Check className="size-4" />
                    Approve & Execute Code
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CODE EXECUTION COMPLETED (Phase 4) */}
          {phase === "completed" && (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="size-8" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Autonomous Code Generation Complete!
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
                  Pocket CTO AI has synthesized and validated all files for your project ({files.length} artifacts). You can inspect them in the IDE workspace or deploy directly to GitHub.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                <Button
                  onClick={() => setNewRepoModalOpen(true)}
                  className="gap-2 bg-gradient-to-r from-primary to-teal-500 font-mono text-xs text-primary-foreground shadow-md"
                >
                  <FolderGit2 className="size-3.5" />
                  Create New GitHub Repo & Push
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    setPhase("input");
                  }}
                  className="font-mono text-xs"
                >
                  Open in IDE Workspace
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Repo Modal for 1-Click Repo Creation */}
      <NewRepoModal
        open={newRepoModalOpen}
        onOpenChange={setNewRepoModalOpen}
        files={files}
        defaultName={ideaTitle.slice(0, 24)}
      />
    </>
  );
}
