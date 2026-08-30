import React, { useState, useEffect, useCallback } from "react";
import {
  Github,
  FolderGit2,
  CheckCircle2,
  Loader2,
  Search,
  Lock,
  Globe,
  Code2,
  FileCode2,
  RefreshCw,
  LogOut,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CodebaseContext } from "@/lib/architect-client";

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name?: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface GitHubSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRepoSynced?: ((context: CodebaseContext, allFiles?: Array<{ name: string; content: string }>, directToStudio?: boolean) => void) | undefined;
  activeContext?: CodebaseContext | null | undefined;
  onClearContext?: (() => void) | undefined;
}

const STORAGE_TOKEN_KEY = "specengine.github_token";

export function GitHubSyncModal({
  open,
  onOpenChange,
  onRepoSynced,
  activeContext,
  onClearContext,
}: GitHubSyncModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualTokenInput, setManualTokenInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Load token from storage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (stored) {
      setToken(stored);
      void fetchUserRepos(stored);
    }
  }, []);

  // Fetch Repositories once connected
  const fetchUserRepos = useCallback(async (authToken: string) => {
    setLoadingRepos(true);
    setError(null);
    try {
      const res = await fetch("/api/github/repos", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = (await res.json()) as {
        user?: GitHubUser;
        repos?: GitHubRepo[];
        error?: string;
      };
      if (res.ok && data.repos) {
        setRepos(data.repos);
        setUserProfile(data.user ?? null);
        localStorage.setItem(STORAGE_TOKEN_KEY, authToken);
        setToken(authToken);
      } else {
        setError(data.error || "Failed to load GitHub repositories.");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  // Trigger GitHub OAuth Redirect
  const handleConnectGitHub = () => {
    const clientId =
      (typeof import.meta !== "undefined" && (import.meta as unknown as { env?: { VITE_GITHUB_CLIENT_ID?: string } }).env?.VITE_GITHUB_CLIENT_ID) ||
      (typeof process !== "undefined" &&
        (process.env?.["VITE_GITHUB_CLIENT_ID"] || process.env?.["GITHUB_CLIENT_ID"])) ||
      "Ov23liKC1BhX95A5pZM0";

    const redirectUri = `${window.location.origin}/api/auth/github/callback`;
    const scope = "repo read:user";
    const state = window.location.pathname;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTokenInput.trim()) return;
    void fetchUserRepos(manualTokenInput.trim());
  };

  const handleDisconnect = () => {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    setToken(null);
    setUserProfile(null);
    setRepos([]);
    setSelectedRepo(null);
    setError(null);
    if (onClearContext) onClearContext();
  };

  // Trigger Sync with the Analyzer Agent
  const handleSyncCodebase = async (directToStudio = true) => {
    if (!selectedRepo) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/github/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          owner: selectedRepo.owner.login,
          repo: selectedRepo.name,
          defaultBranch: selectedRepo.default_branch,
          token,
        }),
      });

      const result = (await res.json()) as {
        success?: boolean;
        codebaseContext?: CodebaseContext;
        allFiles?: Array<{ name: string; content: string }>;
        error?: string;
      };

      if (res.ok && result.success && result.codebaseContext) {
        onRepoSynced?.(result.codebaseContext, result.allFiles, directToStudio);
        onOpenChange(false);
      } else {
        setError(result.error || "Failed to sync codebase context.");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSyncing(false);
    }
  };

  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.description &&
        repo.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-[#090d16] p-6 text-foreground shadow-2xl sm:rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <Github className="size-5" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-lg font-display font-semibold tracking-tight text-foreground">
                  Connect & Sync GitHub Repository
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Inspect your existing repository architecture or launch directly into the Studio to analyze improvements.
                </DialogDescription>
              </div>
            </div>

            {token && userProfile && (
              <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs">
                <img
                  src={userProfile.avatar_url}
                  alt={userProfile.login}
                  className="size-4 rounded-full"
                />
                <span className="font-mono text-primary">@{userProfile.login}</span>
                <button
                  onClick={handleDisconnect}
                  title="Disconnect GitHub"
                  className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <LogOut className="size-3" />
                </button>
              </div>
            )}
          </div>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Not Connected State */}
        {!token ? (
          <div className="py-6 text-center flex flex-col items-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <FolderGit2 className="size-7" />
            </div>
            <h4 className="text-base font-semibold text-foreground mb-1">
              Link your GitHub Account
            </h4>
            <p className="text-xs text-muted-foreground max-w-md mb-6">
              Authorize read access so the Pocket CTO agent can extract existing database
              tables, models, and folder structures.
            </p>

            {!showManualInput ? (
              <div className="flex flex-col items-center gap-3">
                <Button onClick={handleConnectGitHub} className="gap-2 px-6 bg-primary text-primary-foreground">
                  <Github className="size-4" /> Connect with GitHub
                </Button>
                <button
                  type="button"
                  onClick={() => setShowManualInput(true)}
                  className="font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors underline"
                >
                  Or enter GitHub Personal Access Token
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleManualTokenSubmit}
                className="w-full max-w-md space-y-3"
              >
                <div className="space-y-1 text-left">
                  <label className="font-mono text-[11px] text-muted-foreground">
                    GitHub Personal Access Token (classic or fine-grained with repo:read)
                  </label>
                  <Input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={manualTokenInput}
                    onChange={(e) => setManualTokenInput(e.target.value)}
                    className="font-mono text-xs bg-background/60"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowManualInput(false)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loadingRepos || !manualTokenInput.trim()}
                  >
                    {loadingRepos ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      "Connect Token"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Connected State -> Repo Picker */
          <div className="space-y-4 pt-1">
            {activeContext && (
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <FileCode2 className="size-4 text-primary" />
                  <span>
                    Currently synced with:{" "}
                    <strong className="font-mono text-primary">
                      {activeContext.repoName}
                    </strong>{" "}
                    ({activeContext.keyFiles?.length ?? 0} schema/config files loaded)
                  </span>
                </div>
                {onClearContext && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-destructive"
                    onClick={onClearContext}
                  >
                    <X className="size-3 mr-1" /> Unlink
                  </Button>
                )}
              </div>
            )}

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search your repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 font-mono text-xs bg-background/50 text-foreground"
              />
            </div>

            {/* Repo List */}
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {loadingRepos ? (
                <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2 font-mono">
                  <Loader2 className="size-4 animate-spin" /> Loading repositories...
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                  No repositories found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredRepos.map((repo) => {
                  const isSelected = selectedRepo?.id === repo.id;
                  return (
                    <div
                      key={repo.id}
                      onClick={() => setSelectedRepo(repo)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-primary/15 border-primary ring-1 ring-primary"
                          : "bg-background/40 border-border/80 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 text-muted-foreground">
                          {repo.private ? (
                            <Lock className="size-3.5 text-amber-400" />
                          ) : (
                            <Globe className="size-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs truncate text-foreground">
                              {repo.name}
                            </span>
                            {repo.language && (
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border border-border bg-muted/60 text-muted-foreground">
                                {repo.language}
                              </span>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-md mt-0.5">
                              {repo.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="size-4 shrink-0 text-primary" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Action Footer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-3 border-t border-border/80 gap-2">
              <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[240px]">
                {selectedRepo
                  ? `Selected: ${selectedRepo.full_name}`
                  : "Select a repo to proceed"}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => token && fetchUserRepos(token)}
                  disabled={loadingRepos}
                >
                  <RefreshCw
                    className={`size-3.5 ${loadingRepos ? "animate-spin" : ""}`}
                  />
                </Button>

                <Button
                  disabled={!selectedRepo || syncing}
                  onClick={() => handleSyncCodebase(true)}
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-primary to-teal-500 font-mono text-xs font-bold text-primary-foreground shadow-md hover:opacity-95"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Syncing & Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" />
                      Launch in Studio & Analyze Architecture
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
