import React, { useState } from "react";
import {
  GitPullRequest,
  GitBranch,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GITHUB_TOKEN_KEY } from "@/hooks/useAuth";

interface GitPRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repoFullName?: string | undefined;
  defaultTitle?: string | undefined;
}

export function GitPRModal({
  open,
  onOpenChange,
  repoFullName,
  defaultTitle = "feat(spec): automated Pocket CTO architecture & schema specifications",
}: GitPRModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(
    "### 🚀 Automated Architecture Blueprint & Schema by Pocket CTO\n\n- Standardized PostgreSQL Schema DDL with RLS policies\n- High-level system architecture and Mermaid diagrams\n- Interactive UI/UX navigation user flow\n- Phased AI-builder prompts for zero-hallucination execution",
  );
  const [headBranch, setHeadBranch] = useState("spec/pocket-cto-blueprint");
  const [baseBranch, setBaseBranch] = useState("main");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    prNumber: number;
    prUrl: string;
  } | null>(null);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(GITHUB_TOKEN_KEY)
      : null;

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !repoFullName) {
      setError("Please ensure your GitHub account is linked first.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessResult(null);

    try {
      const res = await fetch("/api/github/pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repoFullName,
          title,
          body: description,
          headBranch: baseBranch, // or headBranch
          baseBranch,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        prNumber?: number;
        prUrl?: string;
        error?: string;
      };

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to create Pull Request");
      }

      setSuccessResult({
        prNumber: data.prNumber || 1,
        prUrl: data.prUrl || `https://github.com/${repoFullName}/pulls`,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] border-border bg-[#090d16] text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2 text-purple-400">
            <GitPullRequest className="size-5" />
            <DialogTitle className="text-base font-display font-semibold">
              Open Pull Request on GitHub
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Merge validated architecture blueprints, schemas, and AI prompts directly into your target branch.
          </DialogDescription>
        </DialogHeader>

        {successResult ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Pull Request #{successResult.prNumber} Created Successfully!
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Your PR is open and ready for code review in GitHub.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button asChild className="gap-1.5 font-mono text-xs">
                <a href={successResult.prUrl} target="_blank" rel="noreferrer">
                  View PR on GitHub <ExternalLink className="size-3.5" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSuccessResult(null);
                  onOpenChange(false);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreatePR} className="space-y-4 py-2">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground mb-1 block">
                  Repository
                </label>
                <div className="rounded-md border border-border/80 bg-background/50 px-3 py-2 text-xs font-mono truncate">
                  {repoFullName || "No repo selected"}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-muted-foreground mb-1 block">
                  Target (Base) Branch
                </label>
                <Input
                  value={baseBranch}
                  onChange={(e) => setBaseBranch(e.target.value)}
                  placeholder="main"
                  className="font-mono text-xs h-9 bg-background/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-muted-foreground mb-1 block">
                PR Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="feat(spec): ..."
                className="font-mono text-xs h-9 bg-background/50"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-muted-foreground mb-1 block">
                Pull Request Description (Markdown)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="font-mono text-xs min-h-24 bg-background/50"
                rows={4}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || !repoFullName}
                className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 font-mono text-xs text-white hover:opacity-90 shadow-md"
              >
                {loading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <GitPullRequest className="size-3.5" />
                )}
                Submit Pull Request
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
