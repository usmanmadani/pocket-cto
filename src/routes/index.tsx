import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileText,
  History,
  ListOrdered,
  Loader2,
  LogIn,
  LogOut,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThoughtStream } from "@/components/ThoughtStream";
import {
  parseFiles,
  parsePhases,
  streamPost,
  type BlueprintFile,
  type BuildPhase,
  type Survey,
} from "@/lib/architect-client";
import { downloadPackage, saveProject } from "@/lib/blueprint-store";
import { saveRemoteProject } from "@/lib/projects.functions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SpecEngine — AI Software Architect & Blueprint Generator" },
      {
        name: "description",
        content:
          "Turn any software idea into a PRD, system architecture, PostgreSQL schema, AI-builder prompts and a phased roadmap — generated live by an architect agent.",
      },
      { property: "og:title", content: "SpecEngine — AI Software Architect" },
      {
        property: "og:description",
        content:
          "Describe your idea, answer a smart survey, and download a complete implementation blueprint package.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const EXAMPLES = [
  "AI School Management SaaS for multi-campus private schools",
  "Clinic MIS with billing, EMR and insurance claims",
  "Field logistics dispatch platform for last-mile delivery",
];

type Stage = "idea" | "survey" | "blueprint";

function Home() {
  const [idea, setIdea] = useState("");
  const [stage, setStage] = useState<Stage>("idea");
  const [thoughts, setThoughts] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [raw, setRaw] = useState("");
  const [activeFile, setActiveFile] = useState(0);
  const [view, setView] = useState<"files" | "prompts">("files");
  const [phaseRaw, setPhaseRaw] = useState("");
  const [phaseBusy, setPhaseBusy] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [doneP, setDoneP] = useState<Record<number, boolean>>({});
  const savedIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { user } = useAuth();

  const persist = useCallback(
    async (payload: {
      idea: string;
      domain: string;
      summary: string;
      answers: { question: string; answer: string }[];
      files: BlueprintFile[];
      phases?: BuildPhase[];
    }) => {
      const id = savedIdRef.current;
      if (user) {
        const saved = await saveRemoteProject({
          data: { ...(id ? { id } : {}), ...payload },
        });
        savedIdRef.current = saved.id;
        return;
      }
      const saved = saveProject({ ...(id ? { id } : {}), ...payload });
      savedIdRef.current = saved.id;
    },
    [user],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const files: BlueprintFile[] = useMemo(() => parseFiles(raw), [raw]);
  const phases: BuildPhase[] = useMemo(() => parsePhases(phaseRaw), [phaseRaw]);
  const current = files[Math.min(activeFile, Math.max(files.length - 1, 0))];

  const runSurvey = useCallback(async () => {
    if (idea.trim().length < 3) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError("");
    setThoughts("");
    setSurvey(null);
    setAnswers({});
    setRaw("");
    setPhaseRaw("");
    setStage("survey");
    let json = "";
    await streamPost(
      "/api/survey",
      { idea },
      (e) => {
        if (e.type === "thought") setThoughts((t) => t + e.value);
        else if (e.type === "text") json += e.value;
        else if (e.type === "error") setError(e.value);
      },
      ctrl.signal,
    ).catch((err: unknown) => {
      if ((err as Error)?.name !== "AbortError") setError(String(err));
    });
    try {
      const parsed = JSON.parse(json) as Survey;
      setSurvey(parsed);
      setAnswers(
        Object.fromEntries(parsed.questions.map((q) => [q.id, q.options[0] ?? ""])),
      );
    } catch {
      if (!error) setError("The agent returned an unreadable survey. Try again.");
    }
    setBusy(false);
  }, [idea, error]);

  const runBlueprint = useCallback(async () => {
    if (!survey) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError("");
    setThoughts("");
    setRaw("");
    setActiveFile(0);
    setPhaseRaw("");
    setDoneP({});
    setView("files");
    setStage("blueprint");
    const answerList = survey.questions.map((q) => ({
      question: q.question,
      answer: answers[q.id] ?? "",
    }));
    let text = "";
    await streamPost(
      "/api/blueprint",
      { idea, domain: survey.domain, answers: answerList },
      (e) => {
        if (e.type === "thought") setThoughts((t) => t + e.value);
        else if (e.type === "text") {
          text += e.value;
          setRaw((r) => r + e.value);
        } else if (e.type === "error") setError(e.value);
      },
      ctrl.signal,
    ).catch((err: unknown) => {
      if ((err as Error)?.name !== "AbortError") setError(String(err));
    });
    const generated = parseFiles(text);
    if (generated.length) {
      savedIdRef.current = null;
      await persist({
        idea,
        domain: survey.domain,
        summary: survey.summary,
        answers: answerList,
        files: generated,
      });
    }
    setBusy(false);
  }, [survey, answers, idea, persist]);

  const runPhases = useCallback(async () => {
    if (!files.length) return;
    const ctrl = new AbortController();
    setPhaseBusy(true);
    setError("");
    setThoughts("");
    setPhaseRaw("");
    setView("prompts");
    const answerList =
      survey?.questions.map((q) => ({
        question: q.question,
        answer: answers[q.id] ?? "",
      })) ?? [];
    let text = "";
    await streamPost(
      "/api/phases",
      { idea, domain: survey?.domain, answers: answerList, blueprint: raw },
      (e) => {
        if (e.type === "thought") setThoughts((t) => t + e.value);
        else if (e.type === "text") {
          text += e.value;
          setPhaseRaw((r) => r + e.value);
        } else if (e.type === "error") setError(e.value);
      },
      ctrl.signal,
    ).catch((err: unknown) => {
      if ((err as Error)?.name !== "AbortError") setError(String(err));
    });
    const built = parsePhases(text);
    if (built.length && survey) {
      const saved = saveProject({
        ...(savedIdRef.current ? { id: savedIdRef.current } : {}),
        idea,
        domain: survey.domain,
        summary: survey.summary,
        answers: answerList,
        files,
        phases: built,
      });
      savedIdRef.current = saved.id;
    }
    setPhaseBusy(false);
  }, [files, survey, answers, idea, raw]);

  const copyPrompt = useCallback((p: BuildPhase) => {
    void navigator.clipboard.writeText(p.prompt);
    setCopied(p.number);
    setDoneP((d) => ({ ...d, [p.number]: true }));
    setTimeout(() => setCopied((c) => (c === p.number ? null : c)), 1500);
  }, []);

  const downloadZip = useCallback(
    () =>
      downloadPackage(files, survey?.domain ?? idea, {
        idea,
        domain: survey?.domain ?? "",
        answers:
          survey?.questions.map((q) => ({
            question: q.question,
            answer: answers[q.id] ?? "",
          })) ?? [],
        phases,
      }),
    [files, survey, idea, answers, phases],
  );


  return (
    <main className="min-h-screen">
      <div className="hero-glow">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2 font-mono text-sm tracking-[0.25em] text-primary uppercase">
            <Sparkles className="size-4" /> SpecEngine
          </div>
          <div className="flex items-center gap-1">
            {user ? (
              <>
                <Button asChild variant="ghost" size="sm" className="font-mono text-xs">
                  <Link to="/history">
                    <History /> History
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-mono text-xs"
                  onClick={signOut}
                >
                  <LogOut /> Sign out
                </Button>
              </>
            ) : (
              <Button asChild variant="secondary" size="sm" className="font-mono text-xs">
                <Link to="/auth">
                  <LogIn /> Sign in
                </Link>
              </Button>
            )}
          </div>
        </header>

        <section className="mx-auto max-w-3xl px-6 pt-10 pb-14 text-center">
          <h1 className="font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl">
            From a one-line idea to a{" "}
            <span className="text-primary">complete software blueprint</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            An architect agent interrogates your idea, then compiles a PRD, architecture
            diagrams, PostgreSQL schema, AI-builder prompts and a phased roadmap.
          </p>

          <div className="panel mt-8 p-4 text-left">
            <Textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe the system you want to build..."
              className="min-h-28 resize-none border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setIdea(ex)}
                    className="rounded-full border border-border px-3 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {ex.split(" ").slice(0, 4).join(" ")}
                  </button>
                ))}
              </div>
              <Button onClick={runSurvey} disabled={busy || idea.trim().length < 3}>
                {busy && stage === "survey" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Wand2 />
                )}
                Analyze idea
              </Button>
            </div>
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-6 pb-24">
        {error && (
          <div className="panel border-destructive/60 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {stage !== "idea" && <ThoughtStream text={thoughts} active={busy || phaseBusy} />}

        {survey && stage === "survey" && (
          <section className="space-y-5">
            <div className="panel p-5">
              <div className="font-mono text-xs tracking-[0.2em] text-accent uppercase">
                {survey.domain}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{survey.summary}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {survey.questions.map((q) => (
                <div key={q.id} className="panel p-5">
                  <div className="mb-3 flex items-start gap-2">
                    <span aria-hidden className="text-lg">
                      {q.icon}
                    </span>
                    <h3 className="text-sm font-medium">{q.question}</h3>
                  </div>
                  <div className="grid gap-2">
                    {q.options.map((opt) => {
                      const selected = answers[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                          className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-[13px] transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          {opt}
                          {selected && <Check className="size-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button size="lg" onClick={runBlueprint} disabled={busy}>
                <Sparkles /> Compile blueprint
              </Button>
            </div>
          </section>
        )}

        {stage === "blueprint" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setView("files")}
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors ${
                  view === "files"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="size-3.5" /> Blueprint files
              </button>
              <button
                onClick={() => (phases.length ? setView("prompts") : runPhases())}
                disabled={!files.length || busy || phaseBusy}
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors disabled:opacity-50 ${
                  view === "prompts"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {phaseBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ListOrdered className="size-3.5" />
                )}
                Build prompts{phases.length ? ` (${phases.length})` : ""}
              </button>
            </div>

            {view === "files" && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {files.map((f, i) => (
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
                    {files.length === 0 && (
                      <span className="font-mono text-xs text-muted-foreground">
                        Compiling deliverables...
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!current}
                      onClick={() =>
                        current && navigator.clipboard.writeText(current.content)
                      }
                    >
                      <Copy /> Copy file
                    </Button>
                    <Button size="sm" disabled={!files.length || busy} onClick={downloadZip}>
                      <Download /> Download .zip
                    </Button>
                  </div>
                </div>

                <pre className="panel max-h-[70vh] overflow-auto p-5 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap">
                  {current?.content ?? raw}
                  {busy && <span className="caret text-primary">▍</span>}
                </pre>
              </>
            )}

            {view === "prompts" && (
              <div className="space-y-4">
                <div className="panel flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <h2 className="font-display text-lg font-semibold">
                      Phase-by-phase build prompts
                    </h2>
                    <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                      Copy each prompt in order into Lovable, Cursor, v0 or any AI builder.
                      Finish a phase, then paste the next one — the whole product gets built
                      section by section.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={phaseBusy || !files.length}
                      onClick={runPhases}
                    >
                      {phaseBusy ? <Loader2 className="animate-spin" /> : <Sparkles />}
                      {phases.length ? "Regenerate" : "Generate prompts"}
                    </Button>
                    <Button size="sm" disabled={!phases.length} onClick={downloadZip}>
                      <Download /> Download .zip
                    </Button>
                  </div>
                </div>

                {!phases.length && (
                  <p className="font-mono text-xs text-muted-foreground">
                    {phaseBusy ? "Sequencing build phases..." : "No prompts generated yet."}
                  </p>
                )}

                {phases.map((p) => (
                  <article key={p.number} className="panel p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border font-mono text-xs ${
                            doneP[p.number]
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {doneP[p.number] ? <Check className="size-3.5" /> : p.number}
                        </span>
                        <div>
                          <h3 className="text-sm font-medium">{p.title}</h3>
                          <p className="text-xs text-muted-foreground">{p.outcome}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => copyPrompt(p)}>
                        {copied === p.number ? <Check /> : <Copy />}
                        {copied === p.number ? "Copied" : "Copy prompt"}
                      </Button>
                    </div>
                    <pre className="mt-4 max-h-72 overflow-auto rounded-md border border-border bg-background/40 p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
                      {p.prompt}
                    </pre>
                  </article>
                ))}
                {phaseBusy && <span className="caret font-mono text-primary">▍</span>}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
