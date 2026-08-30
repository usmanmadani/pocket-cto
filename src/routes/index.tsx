import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileCode2,
  FileText,
  FolderGit2,
  Github,
  GitBranch,
  History,
  Code2,


  ListOrdered,
  Loader2,
  LogIn,
  LogOut,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThoughtStream } from "@/components/ThoughtStream";
import { GitHubSyncModal } from "@/components/GitHubSyncModal";
import { UserFlowCanvas } from "@/components/UserFlowCanvas";
import { IDEWorkspace } from "@/components/IDEWorkspace";
import { LovableStudioBuilder } from "@/components/LovableStudioBuilder";
import { AutonomousBuilderModal } from "@/components/AutonomousBuilderModal";
import { NewRepoModal } from "@/components/NewRepoModal";
import {
  parseFiles,
  parsePhases,
  streamPost,
  type BlueprintFile,
  type BuildPhase,
  type CodebaseContext,
  type Survey,
  type UserFlowData,
} from "@/lib/architect-client";
import { downloadPackage, saveProject } from "@/lib/blueprint-store";
import { saveRemoteProject } from "@/lib/projects.functions";
import { useAuth, setCustomSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pocket CTO — AI Software Architect & Blueprint Generator" },
      {
        name: "description",
        content:
          "Turn any software idea into a PRD, system architecture, PostgreSQL schema, AI-builder prompts and a phased roadmap — generated live by Pocket CTO.",
      },
      { property: "og:title", content: "Pocket CTO — AI Software Architect" },
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
  const [view, setView] = useState<"studio" | "files" | "prompts" | "userflow">("studio");
  const [phaseRaw, setPhaseRaw] = useState("");
  const [phaseBusy, setPhaseBusy] = useState(false);
  const [userFlow, setUserFlow] = useState<UserFlowData | null>(null);
  const [userFlowBusy, setUserFlowBusy] = useState(false);
  const [userFlowPng, setUserFlowPng] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [doneP, setDoneP] = useState<Record<number, boolean>>({});
  const [codebaseContext, setCodebaseContext] = useState<CodebaseContext | null>(null);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [builderModalOpen, setBuilderModalOpen] = useState(false);
  const [newRepoModalOpen, setNewRepoModalOpen] = useState(false);
  const savedIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ghToken = params.get("github_token");
    const ghError = params.get("github_error");
    const authUser = params.get("auth_user");

    if (authUser) {
      try {
        const parsed = JSON.parse(authUser);
        setCustomSession(parsed, ghToken || undefined);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch {
        /* ignore */
      }
    } else if (ghToken) {
      localStorage.setItem("specengine.github_token", ghToken);
      setGithubModalOpen(true);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } else if (ghError) {
      setError(`GitHub connection error: ${ghError}`);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  const persist = useCallback(
    async (payload: {
      idea: string;
      domain: string;
      summary: string;
      answers: { question: string; answer: string }[];
      files: BlueprintFile[];
      phases?: BuildPhase[] | undefined;
      userFlow?: UserFlowData | undefined;
      codebaseContext?: CodebaseContext | undefined;
    }) => {
      const id = savedIdRef.current;
      if (user && !String(user.id).startsWith("github_")) {
        try {
          const saved = await saveRemoteProject({
            data: { ...(id ? { id } : {}), ...payload },
          });
          savedIdRef.current = saved.id;
          return;
        } catch {
          /* fallback to local */
        }
      }
      const saved = saveProject({ ...(id ? { id } : {}), ...payload });
      savedIdRef.current = saved.id;
    },
    [user],
  );

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
    setUserFlow(null);
    setUserFlowPng(null);
    setStage("survey");
    let json = "";
    await streamPost(
      "/api/survey",
      { idea, codebaseContext },
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
  }, [idea, error, codebaseContext]);

  const openDirectlyInStudio = useCallback(() => {
    if (!raw && codebaseContext) {
      const initialDoc = [
        `===FILE: README.md===`,
        `# ${codebaseContext.repoName}`,
        ``,
        `Connected to existing GitHub repository **${codebaseContext.repoName}** (${codebaseContext.defaultBranch || "main"}).`,
        `Ingested ${codebaseContext.keyFiles?.length || 0} architecture and schema files.`,
        ``,
        `===FILE: SYSTEM_ARCHITECTURE.md===`,
        `# Architecture & Codebase Map: ${codebaseContext.repoName}`,
        ``,
        `## Existing Schemas & Models`,
        ...(codebaseContext.schemaFiles?.map((f) => `- \`${f.path}\``) ?? ["- Standard project files"]),
        ``,
      ].join("\n");
      setRaw(initialDoc);
    } else if (!raw) {
      const initialDoc = [
        `===FILE: README.md===`,
        `# ${idea.trim() || "My Application"}`,
        ``,
        `Autonomous software project managed by Pocket CTO AI.`,
        ``,
        `===FILE: SYSTEM_ARCHITECTURE.md===`,
        `# System Architecture`,
        ``,
        `## Core Tech Stack`,
        `- Frontend: React, Tailwind CSS, TanStack Router`,
        `- Backend / Database: PostgreSQL, Supabase RLS, Edge APIs`,
        ``,
      ].join("\n");
      setRaw(initialDoc);
    }
    setStage("blueprint");
    setView("studio");
  }, [raw, codebaseContext, idea]);

  const runUserFlow = useCallback(async () => {
    if (!survey) return;
    const ctrl = new AbortController();
    setUserFlowBusy(true);
    setError("");
    setThoughts("");
    setView("userflow");
    const answerList =
      survey.questions.map((q) => ({
        question: q.question,
        answer: answers[q.id] ?? "",
      })) ?? [];
    let json = "";
    await streamPost(
      "/api/user-flow",
      {
        idea,
        domain: survey.domain,
        answers: answerList,
        blueprint: raw,
        codebaseContext,
      },
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
      const cleanJson = json
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      const parsed = JSON.parse(cleanJson) as UserFlowData;
      setUserFlow(parsed);
      const generated = parseFiles(raw);
      await persist({
        idea,
        domain: survey?.domain ?? "SaaS Platform",
        summary: survey?.summary ?? "",
        answers: answerList,
        files: generated,
        phases: parsePhases(phaseRaw),
        userFlow: parsed,
        codebaseContext: codebaseContext ?? undefined,
      });
    } catch (parseErr) {
      if (!error) {
        setError(`Could not render user flow: ${String(parseErr)}`);
      }
    }
    setUserFlowBusy(false);
  }, [survey, answers, idea, raw, phaseRaw, codebaseContext, persist, error]);

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
    setUserFlow(null);
    setUserFlowPng(null);
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
      { idea, domain: survey.domain, answers: answerList, codebaseContext },
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
        codebaseContext: codebaseContext ?? undefined,
      });
    }
    setBusy(false);
  }, [survey, answers, idea, codebaseContext, persist]);

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
      {
        idea,
        domain: survey?.domain,
        answers: answerList,
        blueprint: raw,
        codebaseContext,
      },
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
      await persist({
        idea,
        domain: survey.domain,
        summary: survey.summary,
        answers: answerList,
        files,
        phases: built,
        userFlow: userFlow ?? undefined,
        codebaseContext: codebaseContext ?? undefined,
      });
    }
    setPhaseBusy(false);
  }, [files, survey, answers, idea, raw, userFlow, codebaseContext, persist]);

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
        userFlow: userFlow ?? undefined,
        userFlowPng: userFlowPng ?? undefined,
        codebaseContext: codebaseContext ?? undefined,
      }),
    [files, survey, idea, answers, phases, userFlow, userFlowPng, codebaseContext],
  );


  return (
    <main className="min-h-screen">
      <div className="hero-glow">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/icon.png"
              alt="Pocket CTO Logo"
              className="size-7 object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-mono text-sm font-semibold tracking-[0.2em] text-primary uppercase">
              Pocket CTO
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs gap-1.5"
                  onClick={() => setGithubModalOpen(true)}
                >
                  <Github className="size-3.5" />
                  {codebaseContext ? (
                    <span className="text-primary truncate max-w-[130px]">
                      {codebaseContext.repoName.split("/")[1] || codebaseContext.repoName}
                    </span>
                  ) : (
                    "GitHub Sync"
                  )}
                </Button>
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

        {/* 3-Step Workflow Progress Bar */}
        <div className="mx-auto max-w-2xl px-6 pt-2 pb-6">
          <div className="flex items-center justify-between rounded-full border border-border/80 bg-background/50 p-1.5 backdrop-blur-md">
            {[
              { id: "idea", label: "1. Define System", icon: Sparkles },
              { id: "survey", label: "2. Technical Survey", icon: Wand2 },
              { id: "blueprint", label: "3. Studio & Codebase", icon: Code2 },
            ].map((step, idx) => {
              const Icon = step.icon;
              const isActive = stage === step.id;
              const isPast =
                (stage === "survey" && step.id === "idea") ||
                (stage === "blueprint" && step.id !== "blueprint");

              return (
                <button
                  key={step.id}
                  onClick={() => {
                    if (step.id === "idea") setStage("idea");
                    else if (step.id === "survey" && survey) setStage("survey");
                    else if (step.id === "blueprint") openDirectlyInStudio();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-teal-400 hover:bg-background/80 cursor-pointer"
                  }`}
                >
                  <Icon className="size-3" />
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{idx + 1}</span>
                  {isPast && <Check className="size-3 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>

        <section className="mx-auto max-w-3xl px-6 pt-4 pb-12 text-center">
          <h1 className="font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl">
            From a one-line idea to a{" "}
            <span className="text-primary">production-ready software system</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Pocket CTO AI designs technical architectures, interactive navigation flows, normalized database schemas, and full runnable code with instant GitHub deployment.
          </p>

          <div className="panel mt-8 p-4 text-left">
            {codebaseContext && user && (
              <div className="mb-3 flex items-center justify-between rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderGit2 className="size-4 shrink-0 text-primary" />
                  <span className="truncate font-mono">
                    Extending <strong className="text-primary">{codebaseContext.repoName}</strong>
                  </span>
                  <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                    ({codebaseContext.keyFiles.length} schema files ingested)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] font-mono text-muted-foreground hover:text-primary"
                    onClick={() => setGithubModalOpen(true)}
                  >
                    Change
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-muted-foreground hover:text-destructive"
                    onClick={() => setCodebaseContext(null)}
                    title="Unlink repository"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}

            <Textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder={
                codebaseContext && user
                  ? `Describe the feature or new module to add to ${codebaseContext.repoName}...`
                  : "Describe the system you want to build..."
              }
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
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!user) {
                      void navigate({ to: "/auth" });
                      return;
                    }
                    setGithubModalOpen(true);
                  }}
                  disabled={busy}
                  className="font-mono text-xs gap-1.5"
                >
                  <FolderGit2 className="size-3.5" />
                  {codebaseContext && user ? "Repo Synced" : "Sync Repo"}
                </Button>

                <Button
                  variant="outline"
                  onClick={openDirectlyInStudio}
                  disabled={busy}
                  className="font-mono text-xs gap-1.5 border-teal-500/40 text-teal-400 hover:bg-teal-500/10"
                  title="Skip survey and open directly in Studio AI Builder to edit code or existing repository"
                >
                  <Sparkles className="size-3.5 text-teal-400" />
                  Open in Studio
                </Button>

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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setView("studio")}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors ${
                    view === "studio"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="size-3.5 text-primary" /> Studio AI Builder
                </button>
                <button
                  onClick={() => setView("files")}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors ${
                    view === "files"
                      ? "border-accent bg-accent/10 text-accent font-semibold"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="size-3.5" /> IDE Workspace
                </button>
                <button
                  onClick={() => (userFlow ? setView("userflow") : runUserFlow())}
                  disabled={!files.length || busy || userFlowBusy}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors disabled:opacity-50 ${
                    view === "userflow"
                      ? "border-accent bg-accent/10 text-accent font-semibold"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {userFlowBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <GitBranch className="size-3.5" />
                  )}
                  User Flow Diagram{userFlow ? " (Ready)" : ""}
                </button>
                <button
                  onClick={() => (phases.length ? setView("prompts") : runPhases())}
                  disabled={!files.length || busy || phaseBusy}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors disabled:opacity-50 ${
                    view === "prompts"
                      ? "border-accent bg-accent/10 text-accent font-semibold"
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

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setBuilderModalOpen(true)}
                  className="gap-2 bg-gradient-to-r from-primary to-teal-500 font-mono text-xs text-primary-foreground shadow-md hover:opacity-95"
                >
                  <Sparkles className="size-3.5" />
                  Build Full Software with AI
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewRepoModalOpen(true)}
                  className="gap-2 font-mono text-xs border-border text-foreground hover:bg-background/80"
                >
                  <FolderGit2 className="size-3.5 text-teal-400" />
                  Create GitHub Repo
                </Button>
              </div>
            </div>

            {view === "studio" && (
              <div className="space-y-4">
                <LovableStudioBuilder
                  files={files}
                  userFlow={userFlow}
                  ideaTitle={idea}
                  domain={survey?.domain}
                  repoFullName={codebaseContext?.repoName}
                  codebaseContext={codebaseContext}
                  onUpdateFile={(fileName, newContent) => {
                    setRaw((prev) => {
                      const marker = `===FILE: ${fileName}===`;
                      if (!prev.includes(marker)) return prev;
                      const parts = prev.split(new RegExp(`===FILE:\\s*${fileName}\\s*===`));
                      const after = parts[1] ? parts[1].replace(/^[\s\S]*?(?====FILE:|$)/, `\n${newContent}\n`) : "";
                      return parts[0] + marker + after;
                    });
                  }}
                />
              </div>
            )}

            {view === "files" && (
              <div className="space-y-4">
                {files.length > 0 ? (
                  <IDEWorkspace
                    files={files}
                    userFlow={userFlow}
                    ideaTitle={idea}
                    domain={survey?.domain}
                    repoFullName={codebaseContext?.repoName}
                    onOpenSyncModal={() => setGithubModalOpen(true)}
                    onUpdateFile={(fileName, newContent) => {
                      setRaw((prev) => {
                        const marker = `===FILE: ${fileName}===`;
                        if (!prev.includes(marker)) return prev;
                        const parts = prev.split(new RegExp(`===FILE:\\s*${fileName}\\s*===`));
                        const after = parts[1] ? parts[1].replace(/^[\s\S]*?(?====FILE:|$)/, `\n${newContent}\n`) : "";
                        return parts[0] + marker + after;
                      });
                    }}
                  />
                ) : (
                  <pre className="panel max-h-[70vh] overflow-auto p-5 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap">
                    {raw || "Compiling deliverables..."}
                    {busy && <span className="caret text-primary">▍</span>}
                  </pre>
                )}
              </div>
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

            {view === "userflow" && (
              <div className="space-y-4">
                <div className="panel flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <h2 className="font-display text-lg font-semibold">
                      UI/UX Navigation Hierarchy & Visual User Flow
                    </h2>
                    <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                      Visual navigation map with auth decision routing, central dashboard hub, and
                      color-coded domain feature branches.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={userFlowBusy || !files.length}
                      onClick={runUserFlow}
                    >
                      {userFlowBusy ? <Loader2 className="animate-spin" /> : <Sparkles />}
                      {userFlow ? "Regenerate flow" : "Generate flow"}
                    </Button>
                    <Button size="sm" disabled={!userFlow} onClick={downloadZip}>
                      <Download /> Download .zip
                    </Button>
                  </div>
                </div>

                {userFlowBusy && (
                  <div className="panel p-12 text-center flex flex-col items-center">
                    <Loader2 className="size-8 animate-spin text-primary mb-3" />
                    <p className="font-mono text-xs text-muted-foreground">
                      UI/UX Flow Architect Agent synthesizing navigation tree & branch modules...
                    </p>
                  </div>
                )}

                {userFlow && !userFlowBusy && (
                  <UserFlowCanvas data={userFlow} onImageGenerated={setUserFlowPng} />
                )}

                {!userFlow && !userFlowBusy && (
                  <div className="panel p-12 text-center flex flex-col items-center">
                    <GitBranch className="size-10 text-muted-foreground mb-3" />
                    <p className="font-mono text-xs text-muted-foreground mb-4">
                      No user flow diagram generated yet.
                    </p>
                    <Button onClick={runUserFlow} disabled={!files.length}>
                      <Sparkles className="size-4" /> Synthesize User Flow Diagram
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      <GitHubSyncModal
        open={githubModalOpen}
        onOpenChange={setGithubModalOpen}
        onRepoSynced={setCodebaseContext}
        activeContext={codebaseContext}
        onClearContext={() => setCodebaseContext(null)}
      />

      <AutonomousBuilderModal
        open={builderModalOpen}
        onOpenChange={setBuilderModalOpen}
        files={files}
        userFlow={userFlow}
        codebaseContext={codebaseContext}
        onFilesUpdated={(updatedFiles) => {
          setRaw(
            updatedFiles
              .map((f) => `===FILE: ${f.name}===\n${f.content}\n`)
              .join("\n"),
          );
        }}
        repoFullName={codebaseContext?.repoName}
        ideaTitle={idea}
        domain={survey?.domain}
      />

      <NewRepoModal
        open={newRepoModalOpen}
        onOpenChange={setNewRepoModalOpen}
        files={files}
        defaultName={idea.slice(0, 24)}
      />
    </main>
  );
}
