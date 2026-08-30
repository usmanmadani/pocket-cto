const GOOGLE_ENDPOINT = (model: string, apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${encodeURIComponent(apiKey)}&alt=sse`;

const MODELS = [
  "gemini-2.5-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
];

const DEFAULT_API_KEY = "AIzaSyBthROOHj9Vl35qJ1U5SzGMTxS_3PCYYfM";

type Body = Record<string, unknown>;

export type StreamOptions = {
  instructions: string;
  input: string;
  format?: Body;
  effort?: "low" | "medium" | "high";
  signal?: AbortSignal;
};

function encodeEvent(obj: unknown) {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);
}

function buildBody(opts: StreamOptions): Body {
  const generationConfig: Body = {
    temperature: 0.7,
  };

  if (opts.format) {
    generationConfig["responseMimeType"] = "application/json";
  }

  return {
    systemInstruction: { parts: [{ text: opts.instructions }] },
    contents: [{ role: "user", parts: [{ text: opts.input }] }],
    generationConfig,
  };
}

/**
 * Calls the Google Gemini API (streaming) and re-streams it as a simple
 * SSE feed of `{ type: "thought" | "text" | "error" | "done", value }` events.
 */
export async function streamArchitect(opts: StreamOptions): Promise<Response> {
  const apiKey =
    process.env["GEMINI_API_KEY"] ||
    process.env["GOOGLE_AI_API_KEY"] ||
    process.env["GOOGLE_API_KEY"] ||
    process.env["VITE_GEMINI_API_KEY"] ||
    process.env["VITE_GOOGLE_AI_API_KEY"] ||
    DEFAULT_API_KEY;

  const body = buildBody(opts);

  let upstream: Response | undefined;
  let lastErrorMessage = "";

  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = MODELS[attempt]!;
    try {
      upstream = await fetch(GOOGLE_ENDPOINT(model, apiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: opts.signal ?? null,
      });

      if (upstream.ok && upstream.body) break;

      if (!upstream.ok) {
        const errText = await upstream.text().catch(() => "");
        lastErrorMessage = errText;
      }
    } catch (fetchErr) {
      lastErrorMessage = String(fetchErr);
    }
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }

  if (!upstream || !upstream.ok || !upstream.body) {
    let friendly = "Google AI is temporarily unavailable. Please retry in a moment.";
    try {
      const parsed = JSON.parse(lastErrorMessage);
      if (parsed?.error?.message) {
        friendly = parsed.error.message;
      }
    } catch {
      if (lastErrorMessage) friendly = lastErrorMessage;
    }

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encodeEvent({ type: "error", value: friendly }));
        controller.close();
      },
    });
    return sse(stream);
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  void (async () => {
    let buffer = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            let evt: {
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string; thought?: boolean }> };
              }>;
              error?: { message?: string };
            };
            try {
              evt = JSON.parse(payload);
            } catch {
              continue;
            }
            if (evt.error) {
              await writer.write(
                encodeEvent({ type: "error", value: evt.error.message ?? "Generation failed." }),
              );
              continue;
            }
            const parts = evt.candidates?.[0]?.content?.parts ?? [];
            for (const part of parts) {
              if (!part.text) continue;
              await writer.write(
                encodeEvent({ type: part.thought ? "thought" : "text", value: part.text }),
              );
            }
          }
        }
      }
      await writer.write(encodeEvent({ type: "done" }));
    } catch (err) {
      await writer
        .write(encodeEvent({ type: "error", value: String(err) }))
        .catch(() => undefined);
    } finally {
      await writer.close().catch(() => undefined);
    }
  })();

  return sse(readable);
}

function sse(stream: ReadableStream) {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
