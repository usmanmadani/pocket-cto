import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CloudUpload, Download, FileText, Loader2, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadPackage, listProjects, type SavedProject } from "@/lib/blueprint-store";
import {
  deleteRemoteProject,
  listRemoteProjects,
  saveRemoteProject,
} from "@/lib/projects.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Blueprint History — SpecEngine Saved Spec Packages" },
      {
        name: "description",
        content:
          "Browse every blueprint package SpecEngine generated for your account, reopen the PRD, architecture, schema, prompts and roadmap, or re-download the zip.",
      },
      { property: "og:title", content: "Blueprint History — SpecEngine" },
      {
        property: "og:description",
        content: "Reopen and re-download your past SpecEngine blueprint packages.",
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listRemoteProjects(),
  });

  useEffect(() => setLocal(listProjects()), []);

  const open = useMemo(
    () => projects.find((p) => p.id === openId) ?? null,
    [projects, openId],
  );
  const file = open?.files[Math.min(activeFile, open.files.length - 1)];

  const importLocal = async () => {
    setMigrating(true);
    for (const p of local) {
      await saveRemoteProject({
        data: {
          idea: p.idea,
          domain: p.domain,
          summary: p.summary,
          answers: p.answers,
          files: p.files,
          phases: p.phases ?? [],
        },
      });
    }
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    setMigrating(false);
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Blueprint history</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every package saved to your account. Reopen it or download the zip again.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/">
              <ArrowLeft /> New blueprint
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        </div>
      </div>

      {local.length > 0 && (
        <div className="panel mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            {local.length} blueprint{local.length > 1 ? "s" : ""} are still stored only on
            this device.
          </p>
          <Button size="sm" onClick={importLocal} disabled={migrating}>
            {migrating ? <Loader2 className="animate-spin" /> : <CloudUpload />} Import to
            my account
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="panel p-10 text-center text-sm text-muted-foreground">
          Loading your blueprints...
        </div>
      )}

      {!isLoading && projects.length === 0 && (
        <div className="panel p-10 text-center text-sm text-muted-foreground">
          No saved packages yet. Generate a blueprint and it will appear here.
        </div>
      )}

      <div className="grid gap-4">
        {projects.map((p) => (
          <article key={p.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-[11px] tracking-[0.2em] text-accent uppercase">
                  {p.domain || "blueprint"}
                </div>
                <h2 className="mt-1 truncate text-sm font-medium">{p.idea}</h2>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {new Date(p.createdAt).toLocaleString()} · {p.files.length} files
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setActiveFile(0);
                    setOpenId(openId === p.id ? null : p.id);
                  }}
                >
                  <FileText /> {openId === p.id ? "Close" : "Reopen"}
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    downloadPackage(p.files, p.domain || p.idea, {
                      idea: p.idea,
                      domain: p.domain,
                      answers: p.answers,
                      phases: p.phases ?? [],
                    })
                  }
                >
                  <Download /> .zip
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Delete package"
                  onClick={async () => {
                    await deleteRemoteProject({ data: { id: p.id } });
                    await queryClient.invalidateQueries({ queryKey: ["projects"] });
                    if (openId === p.id) setOpenId(null);
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>

            {open?.id === p.id && (
              <div className="mt-5 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {p.files.map((f, i) => (
                    <button
                      key={f.name}
                      onClick={() => setActiveFile(i)}
                      className={`rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors ${
                        i === activeFile
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
                <pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-background/50 p-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap">
                  {file?.content}
                </pre>
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
