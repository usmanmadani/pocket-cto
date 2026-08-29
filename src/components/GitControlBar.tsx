import React, { useState, useEffect } from "react";
import {
  Github,
  GitBranch,
  GitPullRequest,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GITHUB_TOKEN_KEY } from "@/hooks/useAuth";

interface GitControlBarProps {
  repoFullName?: string;
  files: { name: string; content: string }[];
  onOpenSyncModal: () => void;
  onOpenPRModal: () => void;
  autoSync: boolean;
  onAutoSyncChange: (enabled: boolean) => void;
}

export function GitControlBar({
  repoFullName,
  files,
  onOpenSyncModal,
  onOpenPRModal,
  autoSync,
  onAutoSyncChange,
}: GitControlBarProps) {
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
    url?: string;
  } | null>(null);
  const [branch, setBranch] = useState("main");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(GITHUB_TOKEN_KEY)
      : null;

  const handlePush = async () => {
    if (!token || !repoFullName) {
      onOpenSyncModal();
      return;
    }

    setPushing(true);
    setStatusMessage(null);

    try {
      const commitFiles = files.map((f) => ({
        path: f.name.startsWith("/") ? f.name : `specs/${f.name}`,
        content: f.content,
      }));

      const res = await fetch("/api/github/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repoFullName,
          branch,
          commitMessage: `feat(spec): synchronize ${files.length} blueprint artifacts via Pocket CTO [skip ci]`,
          files: commitFiles,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        commitSha?: string;
        commitUrl?: string;
        error?: string;
      };

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to commit changes");
      }

      setStatusMessage({
        type: "success",
        text: `Committed ${data.commitSha?.slice(0, 7)} to ${branch}`,
        url: data.commitUrl,
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: (err as Error).message,
      });
    } finally {
      setPushing(false);
    }
  };

  const handlePull = async () => {
    if (!token || !repoFullName) {
      onOpenSyncModal();
      return;
    }

    setPulling(true);
    setStatusMessage(null);

    try {
      const res = await fetch(
        `/api/github/pull?repo=${encodeURIComponent(repoFullName)}&branch=${encodeURIComponent(branch)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = (await res.json()) as {
        success?: boolean;
        latestCommit?: { sha: string; message: string; author: string };
        error?: string;
      };

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to pull branch status");
      }

      if (data.latestCommit) {
        setStatusMessage({
          type: "info",
          text: `Branch ${branch} is on ${data.latestCommit.sha} ("${data.latestCommit.message.slice(0, 30)}...") by ${data.latestCommit.author}`,
        });
      }
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: (err as Error).message,
      });
    } finally {
      setPulling(false);
    }
  };

  // Auto-sync effect if enabled and files changed
  useEffect(() => {
    if (autoSync && repoFullName && token && files.length > 0) {
      const timer = setTimeout(() => {
        void handlePush();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [autoSync, files.length]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-[#080d1a] px-4 py-2.5 text-xs text-foreground">
      {/* Left: Connected Repository & Branch Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/50 px-2.5 py-1">
          <Github className="size-3.5 text-muted-foreground" />
          {repoFullName ? (
            <span className="font-mono font-medium text-foreground">
              {repoFullName}
            </span>
          ) : (
            <span className="font-mono text-muted-foreground">
              No Git Repo Linked
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary">
          <GitBranch className="size-3.5" />
          <span className="font-mono font-semibold">{branch}</span>
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
        </div>

        {statusMessage && (
          <div
            className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[11px] ${
              statusMessage.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : statusMessage.type === "error"
                  ? "bg-destructive/10 text-destructive border border-destructive/30"
                  : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="size-3" />
            ) : statusMessage.type === "error" ? (
              <AlertCircle className="size-3" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            <span className="truncate max-w-[280px]">{statusMessage.text}</span>
            {statusMessage.url && (
              <a
                href={statusMessage.url}
                target="_blank"
                rel="noreferrer"
                className="hover:underline flex items-center gap-0.5"
              >
                <ExternalLink className="size-2.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Right: Git Actions & Auto-Sync Switch */}
      <div className="flex items-center gap-2">
        {/* Auto Sync Toggle */}
        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-1">
          <Zap className="size-3 text-amber-400" />
          <Label
            htmlFor="auto-sync-toggle"
            className="cursor-pointer font-mono text-[11px] text-muted-foreground select-none"
          >
            Auto-Sync
          </Label>
          <Switch
            id="auto-sync-toggle"
            checked={autoSync}
            onCheckedChange={onAutoSyncChange}
            className="scale-75 data-[state=checked]:bg-primary"
          />
        </div>

        {/* Pull Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePull}
          disabled={pulling || !repoFullName}
          className="h-7 gap-1.5 border-border/80 font-mono text-xs hover:bg-background/80"
          title="Fetch latest remote commit status and check diffs"
        >
          {pulling ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <ArrowDownToLine className="size-3 text-blue-400" />
          )}
          Pull
        </Button>

        {/* Push Button */}
        <Button
          size="sm"
          onClick={handlePush}
          disabled={pushing || !files.length}
          className="h-7 gap-1.5 bg-primary font-mono text-xs text-primary-foreground hover:opacity-90 shadow-sm"
          title="Stage files and push directly to GitHub branch"
        >
          {pushing ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <ArrowUpFromLine className="size-3" />
          )}
          Push to GitHub
        </Button>

        {/* Pull Request / Merge Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenPRModal}
          disabled={!repoFullName}
          className="h-7 gap-1.5 font-mono text-xs"
          title="Open a Pull Request on GitHub"
        >
          <GitPullRequest className="size-3 text-purple-400" />
          Create PR
        </Button>
      </div>
    </div>
  );
}
