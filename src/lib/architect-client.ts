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
