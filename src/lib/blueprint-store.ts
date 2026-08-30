import JSZip from "jszip";
import type {
  BlueprintFile,
  BuildPhase,
  CodebaseContext,
  Survey,
  UserFlowData,
} from "./architect-client";

const KEY = "specengine.projects.v1";
const CHATS_KEY = "specengine.studio_chats.v1";

export interface StudioChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  tasks?: string[];
  filesChanged?: string[];
  migrationSql?: string;
  timestamp?: string;
}

export type SavedProject = {
  id: string;
  idea: string;
  domain: string;
  summary: string;
  createdAt: string;
  answers: { question: string; answer: string }[];
  files: BlueprintFile[];
  phases?: BuildPhase[] | undefined;
  userFlow?: UserFlowData | undefined;
  codebaseContext?: CodebaseContext | undefined;
  chatHistory?: StudioChatMessage[] | undefined;
};

export const CANONICAL_FILES = [
  "PRD.md",
  "SYSTEM_ARCHITECTURE.md",
  "DATABASE_SCHEMA.sql",
  "USER_FLOW.md",
  "AI_BUILDER_PROMPTS.md",
  "IMPLEMENTATION_ROADMAP.md",
];

function order(files: BlueprintFile[]): BlueprintFile[] {
  const rank = (n: string) => {
    const i = CANONICAL_FILES.findIndex((c) => c.toLowerCase() === n.toLowerCase());
    return i === -1 ? CANONICAL_FILES.length : i;
  };
  return [...files].sort((a, b) => rank(a.name) - rank(b.name));
}

export function slugify(value: string) {
  return (value || "blueprint").toLowerCase().replace(/\W+/g, "-").replace(/^-|-$/g, "");
}

export function listProjects(): SavedProject[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as SavedProject[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getProject(id: string) {
  return listProjects().find((p) => p.id === id) ?? null;
}

export function saveProject(
  project: Omit<SavedProject, "id" | "createdAt"> & Partial<Pick<SavedProject, "id">>,
): SavedProject {
  const entry: SavedProject = {
    ...project,
    files: order(project.files),
    id: project.id ?? crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...listProjects().filter((p) => p.id !== entry.id)].slice(0, 50);
  localStorage.setItem(KEY, JSON.stringify(next));
  return entry;
}

export function deleteProject(id: string) {
  localStorage.setItem(KEY, JSON.stringify(listProjects().filter((p) => p.id !== id)));
}

/**
 * Persists studio chat messages for a specific project/idea
 */
export function saveStudioChat(projectIdOrIdea: string, chatHistory: StudioChatMessage[]) {
  if (typeof window === "undefined" || !projectIdOrIdea) return;
  try {
    const normalizedKey = slugify(projectIdOrIdea);
    const existing = JSON.parse(localStorage.getItem(CHATS_KEY) ?? "{}") as Record<string, StudioChatMessage[]>;
    existing[normalizedKey] = chatHistory;
    localStorage.setItem(CHATS_KEY, JSON.stringify(existing));

    // Also update project entry if matched
    const projects = listProjects();
    const idx = projects.findIndex(
      (p) => p.id === projectIdOrIdea || slugify(p.idea) === normalizedKey,
    );
    if (idx >= 0) {
      projects[idx].chatHistory = chatHistory;
      localStorage.setItem(KEY, JSON.stringify(projects));
    }
  } catch {
    /* ignore */
  }
}

/**
 * Retrieves persisted studio chat messages for a specific project/idea
 */
export function getStudioChat(projectIdOrIdea: string): StudioChatMessage[] | null {
  if (typeof window === "undefined" || !projectIdOrIdea) return null;
  try {
    const normalizedKey = slugify(projectIdOrIdea);
    const existing = JSON.parse(localStorage.getItem(CHATS_KEY) ?? "{}") as Record<string, StudioChatMessage[]>;
    if (existing[normalizedKey] && Array.isArray(existing[normalizedKey])) {
      return existing[normalizedKey];
    }
    const project = getProject(projectIdOrIdea);
    if (project?.chatHistory) return project.chatHistory;
    return null;
  } catch {
    return null;
  }
}

/** Packages the blueprint deliverables into a single .zip and triggers a download. */
export async function downloadPackage(
  files: BlueprintFile[],
  name: string,
  meta?: {
    idea: string;
    domain: string;
    answers: { question: string; answer: string }[];
    phases?: BuildPhase[] | undefined;
    userFlow?: UserFlowData | undefined;
    userFlowPng?: string | undefined;
    codebaseContext?: CodebaseContext | undefined;
  },
) {
  const zip = new JSZip();
  const folder = zip.folder(slugify(name)) ?? zip;
  order(files).forEach((f) => folder.file(f.name, f.content));

  if (meta?.userFlow) {
    folder.file("USER_FLOW.json", JSON.stringify(meta.userFlow, null, 2));
  }

  if (meta?.userFlowPng && meta.userFlowPng.startsWith("data:image/png;base64,")) {
    const base64Data = meta.userFlowPng.replace(/^data:image\/png;base64,/, "");
    folder.file("user-flow.png", base64Data, { base64: true });
  }

  if (meta) {
    folder.file(
      "SPEC_MANIFEST.md",
      [
        `# ${meta.domain || "Blueprint"}`,
        "",
        `**Idea:** ${meta.idea}`,
        `**Generated:** ${new Date().toISOString()}`,
        ...(meta.codebaseContext
          ? [
              `**Connected Repository:** ${meta.codebaseContext.repoName} (${meta.codebaseContext.defaultBranch || "main"})`,
              `**Detected Schema/Config Files:** ${meta.codebaseContext.keyFiles?.map((f) => f.path).join(", ") || "None"}`,
            ]
          : []),
        "",
        "## Survey answers",
        ...meta.answers.map((a) => `- **${a.question}** — ${a.answer}`),
        "",
        "## Files",
        ...order(files).map((f) => `- ${f.name}`),
        ...(meta.userFlow ? ["- USER_FLOW.json", "- user-flow.png"] : []),
      ].join("\n"),
    );
  }
  const phases = meta?.phases ?? [];
  if (phases.length) {
    const prompts = folder.folder("BUILD_PROMPTS") ?? folder;
    phases.forEach((p) => {
      const file = `phase-${String(p.number).padStart(2, "0")}-${slugify(p.title)}.md`;
      prompts.file(
        file,
        [`# Phase ${p.number} — ${p.title}`, "", `> ${p.outcome}`, "", p.prompt].join("\n"),
      );
    });
    prompts.file(
      "00_INDEX.md",
      [
        "# Build prompts",
        "",
        "Paste each prompt into your AI builder in order. Finish one phase before starting the next.",
        "",
        ...phases.map(
          (p) =>
            `${p.number}. **${p.title}** — ${p.outcome} (phase-${String(p.number).padStart(2, "0")}-${slugify(p.title)}.md)`,
        ),
      ].join("\n"),
    );
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(name)}-spec.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export type { BuildPhase, Survey, UserFlowData };
