export type StreamEvent =
  | { type: "thought"; value: string }
  | { type: "text"; value: string }
  | { type: "error"; value: string }
  | { type: "done" };

export async function streamPost(
  url: string,
  body: unknown,
  onEvent: (e: StreamEvent) => void,
  signal?: AbortSignal,
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: signal ?? null,
  });
  if (!res.ok || !res.body) {
    onEvent({ type: "error", value: (await res.text()) || "Request failed." });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice(5).trim()) as StreamEvent);
      } catch {
        /* ignore partial */
      }
    }
  }
}

export type SurveyQuestion = {
  id: string;
  icon: string;
  question: string;
  options: string[];
};

export type Survey = {
  domain: string;
  summary: string;
  questions: SurveyQuestion[];
};

export type KeyFile = {
  path: string;
  content: string;
};

export type CodebaseContext = {
  repoName: string;
  defaultBranch?: string;
  fileTree: string[];
  keyFiles: KeyFile[];
};

export type BlueprintFile = { name: string; content: string };

/** Splits the streamed blueprint text into files on `===FILE: name===` markers. */
export function parseFiles(text: string): BlueprintFile[] {
  const parts = text.split(/^===FILE:\s*(.+?)\s*===\s*$/gm);
  const files: BlueprintFile[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    files.push({ name: (parts[i] ?? "").trim(), content: (parts[i + 1] ?? "").trim() });
  }
  return files;
}

export type BuildPhase = {
  number: number;
  title: string;
  outcome: string;
  prompt: string;
};

/** Splits streamed phase text on `===PHASE n :: title :: outcome===` markers. */
export function parsePhases(text: string): BuildPhase[] {
  const parts = text.split(/^===PHASE\s*(\d+)\s*::\s*(.*?)\s*::\s*(.*?)\s*===\s*$/gm);
  const phases: BuildPhase[] = [];
  for (let i = 1; i < parts.length; i += 4) {
    phases.push({
      number: Number(parts[i] ?? phases.length + 1),
      title: (parts[i + 1] ?? "").trim(),
      outcome: (parts[i + 2] ?? "").trim(),
      prompt: (parts[i + 3] ?? "").trim(),
    });
  }
  return phases;
}
