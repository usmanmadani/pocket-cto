import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CloudUpload, Download, FileText, Loader2, LogOut, Trash2, Sparkles, FolderGit2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadPackage, listProjects, type SavedProject } from "@/lib/blueprint-store";
import {
  deleteRemoteProject,
  listRemoteProjects,
  saveRemoteProject,
} from "@/lib/projects.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, setCustomSession } from "@/hooks/useAuth";
import { IDEWorkspace } from "@/components/IDEWorkspace";
import { GitHubSyncModal } from "@/components/GitHubSyncModal";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Blueprint History — Pocket CTO Saved Packages" },
      {
        name: "description",
        content:
          "Browse every blueprint package Pocket CTO generated for your account, reopen the PRD, architecture, schema, prompts and roadmap, or re-download the zip.",
      },
      { property: "og:title", content: "Blueprint History — Pocket CTO" },
      {
        property: "og:description",
        content: "Reopen and re-download your past Pocket CTO blueprint packages.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState(0);
  const [local, setLocal] = useState<SavedProject[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, signOut: authSignOut } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const authUser = params.get("auth_user");
    const ghToken = params.get("github_token");
    if (authUser) {
      try {
        const parsed = JSON.parse(authUser);
        setCustomSession(parsed, ghToken || undefined);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const { data: remoteProjects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listRemoteProjects().catch(() => []),
  });

  useEffect(() => setLocal(listProjects()), []);

  const projects = useMemo(() => {
    if (remoteProjects && remoteProjects.length > 0) return remoteProjects;
    return local;
  }, [remoteProjects, local]);

  const open = useMemo(
    () => projects.find((p) => p.id === openId) ?? null,
    [projects, openId],
  );

  const importLocal = async () => {
    setMigrating(true);
    try {
      for (const p of local) {
        await saveRemoteProject({
          data: {
            idea: p.idea,
            domain: p.domain,
            summary: p.summary,
            answers: p.answers,
            files: p.files,
            phases: p.phases ?? [],
            chat_history: p.chatHistory ?? [],
          },
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch {
      /* ignore if remote not available */
    }
    setMigrating(false);
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await authSignOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Blueprint History
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
            Every software system, architecture, and live project saved to your account.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          <Button asChild variant="secondary" size="sm" className="font-mono text-xs text-foreground font-semibold">
            <Link to="/">
              <ArrowLeft className="size-3.5 mr-1" /> New Blueprint
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="font-mono text-xs text-foreground font-semibold">
            <Link to="/profile">
              <User className="size-3.5 mr-1 text-primary" /> Profile & Account
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="font-mono text-xs text-rose-500 hover:bg-rose-500/10"
          >
            <LogOut className="size-3.5 mr-1" /> Sign out
          </Button>
        </div>
      </div>

      {local.length > 0 && (
        <div className="panel mb-6 flex flex-wrap items-center justify-between gap-3 p-4 border border-teal-500/40 bg-teal-500/5">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {local.length} blueprint{local.length > 1 ? "s" : ""} saved on this device.
          </p>
          <Button size="sm" onClick={importLocal} disabled={migrating} className="font-mono text-xs bg-primary text-primary-foreground font-semibold">
            {migrating ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <CloudUpload className="size-3.5 mr-1" />}
            Sync to Cloud Account
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="panel p-12 text-center text-sm font-semibold text-foreground">
          <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
          Loading your blueprints & codebase packages...
        </div>
      )}

      {!isLoading && projects.length === 0 && (
        <div className="panel p-12 text-center text-sm font-semibold text-foreground">
          <FolderGit2 className="size-8 mx-auto mb-2 text-muted-foreground opacity-60" />
          No saved packages yet. Generate a blueprint on the home page and it will appear here.
        </div>
      )}

      {/* Projects List */}
      <div className="grid gap-4">
        {projects.map((p) => (
          <article
            key={p.id}
            className="panel p-5 sm:p-6 transition-all hover:border-primary/40 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                    {p.domain || "SaaS Platform"}
                  </span>
                  {p.chatHistory && p.chatHistory.length > 0 && (
                    <span className="font-mono text-[10px] font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1">
                      <Sparkles className="size-2.5" /> {p.chatHistory.length} chat logs
                    </span>
                  )}
                </div>

                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  {p.idea}
                </h2>

                <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(p.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })} · <span className="text-teal-700 dark:text-teal-300 font-bold">{p.files.length} files generated</span>
                </p>

                {p.summary && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 line-clamp-2">
                    {p.summary}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="font-mono text-xs font-semibold text-foreground"
                  onClick={() => {
                    setActiveFile(0);
                    setOpenId(openId === p.id ? null : p.id);
                  }}
                >
                  <FileText className="size-3.5 mr-1" />
                  {openId === p.id ? "Close Workspace" : "Open in Workspace"}
                </Button>

                <Button
                  size="sm"
                  className="font-mono text-xs bg-primary text-primary-foreground font-semibold shadow-sm"
                  onClick={() =>
                    downloadPackage(p.files, p.domain || p.idea, {
                      idea: p.idea,
                      domain: p.domain,
                      answers: p.answers,
                      phases: p.phases ?? [],
                      userFlow: p.userFlow,
                    })
                  }
                >
                  <Download className="size-3.5 mr-1" /> Export .zip
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Delete package"
                  className="text-rose-500 hover:bg-rose-500/10 size-8 p-0"
                  onClick={async () => {
                    await deleteRemoteProject({ data: { id: p.id } });
                    await queryClient.invalidateQueries({ queryKey: ["projects"] });
                    if (openId === p.id) setOpenId(null);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            {/* Embedded Interactive Workspace */}
            {open?.id === p.id && (
              <div className="mt-5 pt-4 border-t border-border">
                <IDEWorkspace
                  files={p.files}
                  userFlow={p.userFlow}
                  ideaTitle={p.idea}
                  domain={p.domain}
                  repoFullName={p.codebaseContext?.repoName}
                  onOpenSyncModal={() => setSyncModalOpen(true)}
                />
              </div>
            )}
          </article>
        ))}
      </div>

      <GitHubSyncModal
        open={syncModalOpen}
        onOpenChange={setSyncModalOpen}
      />
    </main>
  );
}
