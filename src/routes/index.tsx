import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, History, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThoughtStream } from "@/components/ThoughtStream";
import {
  parseFiles,
  streamPost,
  type BlueprintFile,
  type Survey,
} from "@/lib/architect-client";
import { downloadPackage, saveProject } from "@/lib/blueprint-store";


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
  const abortRef = useRef<AbortController | null>(null);

  const files: BlueprintFile[] = useMemo(() => parseFiles(raw), [raw]);
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
      saveProject({
        idea,
        domain: survey.domain,
        summary: survey.summary,
        answers: answerList,
        files: generated,
      });
    }
    setBusy(false);
  }, [survey, answers, idea]);

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
      }),
    [files, survey, idea, answers],
  );


  return (
    <main className="min-h-screen">
      <div className="hero-glow">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2 font-mono text-sm tracking-[0.25em] text-primary uppercase">
            <Sparkles className="size-4" /> SpecEngine
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            architect agent · v1
          </span>
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

        {stage !== "idea" && <ThoughtStream text={thoughts} active={busy} />}

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
                  onClick={() => current && navigator.clipboard.writeText(current.content)}
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
          </section>
        )}
      </div>
    </main>
  );
}
