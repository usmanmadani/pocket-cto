import React, { useState } from "react";
import {
  FolderGit2,
  Lock,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  ArrowUpRight,
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GITHUB_TOKEN_KEY } from "@/hooks/useAuth";
import type { BlueprintFile } from "@/lib/architect-client";

interface NewRepoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: BlueprintFile[];
  defaultName?: string | undefined;
  onRepoCreated?: ((repoFullName: string) => void) | undefined;
}

export function NewRepoModal({
  open,
  onOpenChange,
  files,
  defaultName = "",
  onRepoCreated,
}: NewRepoModalProps) {
  const [repoName, setRepoName] = useState(
    defaultName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "") || "my-pocket-app",
  );
  const [description, setDescription] = useState(
    "Full-stack software engineered and deployed autonomously by Pocket CTO AI",
  );
  const [isPrivate, setIsPrivate] = useState(false);
  const [pushFiles, setPushFiles] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    repoFullName: string;
    repoUrl: string;
    commitSha?: string | undefined;
  } | null>(null);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(GITHUB_TOKEN_KEY)
      : null;

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Please sign in or link your GitHub account first.");
      return;
    }

    if (!repoName.trim()) {
      setError("Please provide a valid repository name.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 1. Create Repository
      const createRes = await fetch("/api/github/create-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: repoName.trim(),
          description,
          isPrivate,
        }),
      });

      const repoData = (await createRes.json()) as {
        success?: boolean;
        repoFullName?: string;
        repoUrl?: string;
        defaultBranch?: string;
        error?: string;
      };

      if (!createRes.ok || repoData.error || !repoData.repoFullName) {
        throw new Error(repoData.error || "Failed to create GitHub repository");
      }

      let commitSha: string | undefined;

      // 2. Push Codebase if selected
      if (pushFiles && files.length > 0) {
        const commitFiles = files.map((f) => ({
          path: f.name.startsWith("/") ? f.name : `specs/${f.name}`,
          content: f.content,
        }));

        // Allow GitHub a moment to provision default branch ref
        await new Promise((r) => setTimeout(r, 1200));

        const commitRes = await fetch("/api/github/commit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            repoFullName: repoData.repoFullName,
            branch: repoData.defaultBranch || "main",
            commitMessage: `feat(init): autonomous software architecture & codebase initialization via Pocket CTO`,
            files: commitFiles,
          }),
        });

        const commitData = (await commitRes.json()) as {
          success?: boolean;
          commitSha?: string;
        };

        if (commitData.commitSha) {
          commitSha = commitData.commitSha;
        }
      }

      setResult({
        repoFullName: repoData.repoFullName,
        repoUrl: repoData.repoUrl || `https://github.com/${repoData.repoFullName}`,
        commitSha,
      });

      if (onRepoCreated) {
        onRepoCreated(repoData.repoFullName);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-border bg-[#090d16] text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <FolderGit2 className="size-5" />
            <DialogTitle className="text-base font-display font-semibold">
              Create New GitHub Repository
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Deploy your generated software specifications, schemas, and runnable code to a fresh GitHub repo.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Repository Created & Synced!
              </h4>
              <p className="text-xs font-mono text-primary mt-1">
                {result.repoFullName}
              </p>
              {result.commitSha && (
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                  Initial commit: {result.commitSha.slice(0, 7)} ({files.length} files pushed)
                </p>
              )}
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button asChild className="gap-1.5 font-mono text-xs">
                <a href={result.repoUrl} target="_blank" rel="noreferrer">
                  Open in GitHub <ArrowUpRight className="size-3.5" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResult(null);
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateRepo} className="space-y-4 py-2">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div>
              <label className="text-[11px] font-mono text-muted-foreground mb-1 block">
                Repository Name
              </label>
              <Input
                value={repoName}
                onChange={(e) => setRepoName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                placeholder="my-new-saas"
                className="font-mono text-xs h-9 bg-background/50"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-muted-foreground mb-1 block">
                Description (Optional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="font-mono text-xs min-h-16 bg-background/50"
                rows={2}
              />
            </div>

            {/* Privacy switch */}
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-2.5">
                {isPrivate ? (
                  <Lock className="size-4 text-amber-400" />
                ) : (
                  <Globe className="size-4 text-teal-400" />
                )}
                <div>
                  <div className="text-xs font-semibold">
                    {isPrivate ? "Private Repository" : "Public Repository"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {isPrivate ? "Only you can see this repository" : "Anyone on the internet can see this repository"}
                  </div>
                </div>
              </div>
              <Switch
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
            </div>

            {/* Auto push files checkbox */}
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="size-4 text-primary" />
                <div>
                  <div className="text-xs font-semibold">
                    Push Current Codebase ({files.length} artifacts)
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Immediately commits and uploads all generated blueprint files
                  </div>
                </div>
              </div>
              <Switch
                checked={pushFiles}
                onCheckedChange={setPushFiles}
              />
            </div>

            <DialogFooter className="pt-2">
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
                disabled={loading || !token}
                className="gap-2 bg-gradient-to-r from-primary to-teal-500 font-mono text-xs text-primary-foreground hover:opacity-90 shadow-md"
              >
                {loading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <FolderGit2 className="size-3.5" />
                )}
                Create & Push to GitHub
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
