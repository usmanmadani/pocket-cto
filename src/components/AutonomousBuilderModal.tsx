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
import { streamPost, parseFiles, type BlueprintFile } from "@/lib/architect-client";
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
  repoFullName?: string;
  ideaTitle: string;
  domain?: string;
}

export function AutonomousBuilderModal({
  open,
  onOpenChange,
  files,
  onFilesUpdated,
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

  // 1. Generate Implementation Plan (Phase 2)
  const handleGeneratePlan = async (promptText = iterationPrompt) => {
    if (!promptText.trim()) return;
    setBusy(true);
    setError(null);
    setThoughts("");
    setPhase("planning");

    let planJson = "";
    try {
      await streamPost(
        "/api/agent/plan",
        {
          iterationPrompt: promptText,
          currentFiles: files,
          codebaseContext: repoFullName ? { repoName: repoFullName } : undefined,
          blueprintSummary: `${ideaTitle} (${domain || "Software"})`,
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
          codebaseContext: repoFullName ? { repoName: repoFullName } : undefined,
        },
        (e) => {
          if (e.type === "thought") setThoughts((t) => t + e.value);
          else if (e.type === "text") codeStream += e.value;
          else if (e.type === "error") setError(e.value);
        },
      );

      const generated = parseFiles(codeStream);
      if (generated.length > 0) {
        // Merge generated files into existing files
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
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto border-border bg-[#080d1a] text-foreground">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="size-5" />
              <DialogTitle className="text-base font-display font-semibold">
                Pocket CTO AI — Autonomous Software Builder
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Iterate on your architecture, approve technical plans, generate runnable multi-file code, and deploy to GitHub.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Thought stream monitor */}
          {busy && <ThoughtStream text={thoughts} active={busy} />}

          {/* STEP 1: PROMPT INPUT */}
          {phase === "input" && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  What feature or module would you like to build / iterate?
                </label>
                <Textarea
                  value={iterationPrompt}
                  onChange={(e) => setIterationPrompt(e.target.value)}
                  placeholder="e.g. Implement Stripe subscription checkout, webhook handler, and customer billing portal with Supabase RLS..."
                  className="font-mono text-xs min-h-24 bg-background/50 border-border/80"
                  rows={3}
                />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-muted-foreground">
                  Quick Iterations:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Add Stripe billing & webhook handler",
                    "Implement Role-Based Access Control (RBAC)",
                    "Add PostgreSQL full-text search index & API",
                    "Add email notification dispatch with Resend",
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
                <p className="text-xs text-muted-foreground mt-1">
                  {plan.summary}
                </p>
              </div>

              {/* Task Checklist */}
              <div className="rounded-xl border border-border/80 bg-background/40 p-4 space-y-2">
                <h4 className="font-mono text-xs font-semibold text-foreground uppercase tracking-wider">
                  Planned Tasks
                </h4>
                <div className="space-y-1.5">
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
                  Target Files & Diffs
                </h4>
                <div className="space-y-1.5">
                  {plan.affected_files.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/50 bg-background/60 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`px-1.5 py-0.2 text-[9px] rounded font-bold uppercase ${
                            file.action === "create"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : file.action === "delete"
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
                    placeholder="Provide tweak instructions e.g. 'Use Prisma instead of raw SQL'..."
                    className="font-mono text-xs h-8 bg-background/50"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 font-mono text-xs gap-1"
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
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Pocket CTO AI has verified and updated your project files. You can inspect the code in the IDE workspace or deploy directly to GitHub.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                <Button
                  onClick={() => {
                    setNewRepoModalOpen(true);
                  }}
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
