import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteProject,
  downloadPackage,
  listProjects,
  type SavedProject,
} from "@/lib/blueprint-store";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Blueprint History — SpecEngine Saved Spec Packages" },
      {
        name: "description",
        content:
          "Browse every blueprint package SpecEngine generated for you, reopen the PRD, architecture, schema, prompts and roadmap, or re-download the zip.",
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
  component: History,
});

function History() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState(0);

  useEffect(() => setProjects(listProjects()), []);

  const open = useMemo(
    () => projects.find((p) => p.id === openId) ?? null,
    [projects, openId],
  );
  const file = open?.files[Math.min(activeFile, open.files.length - 1)];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Blueprint history</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every package you generated on this device. Reopen it or download the zip
            again.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/">
            <ArrowLeft /> New blueprint
          </Link>
        </Button>
      </div>

      {projects.length === 0 && (
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
                    })
                  }
                >
                  <Download /> .zip
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Delete package"
                  onClick={() => {
                    deleteProject(p.id);
                    setProjects(listProjects());
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
