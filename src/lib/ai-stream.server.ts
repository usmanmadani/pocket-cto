const GOOGLE_ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

const MODEL = "gemini-flash-latest";

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

/** Google's responseSchema is OpenAPI-flavoured: strip JSON-Schema-only keywords. */
function toGoogleSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGoogleSchema);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (key === "additionalProperties" || key === "strict" || key === "name") continue;
    out[key] = toGoogleSchema(value);
  }
  return out;
}

function thinkingBudget(effort: StreamOptions["effort"]) {
  if (effort === "low") return 1024;
  if (effort === "high") return 16384;
  return 4096;
}

/**
 * Calls the Google Gemini API (streaming) and re-streams it as a simple
 * SSE feed of `{ type: "thought" | "text" | "error" | "done", value }` events.
 */
export async function streamArchitect(opts: StreamOptions): Promise<Response> {
  const apiKey = process.env["GOOGLE_AI_API_KEY"];
  if (!apiKey) {
    return new Response("Missing GOOGLE_AI_API_KEY", { status: 500 });
  }

  const generationConfig: Body = {
    temperature: 0.7,
    thinkingConfig: {
      includeThoughts: true,
      thinkingBudget: thinkingBudget(opts.effort),
    },
  };

  const jsonSchema = (opts.format as { schema?: unknown } | undefined)?.schema;
  if (jsonSchema) {
    generationConfig["responseMimeType"] = "application/json";
    generationConfig["responseSchema"] = toGoogleSchema(jsonSchema);
  }

  const body: Body = {
    systemInstruction: { parts: [{ text: opts.instructions }] },
    contents: [{ role: "user", parts: [{ text: opts.input }] }],
    generationConfig,
  };

  const authHeaders: Record<string, string> = { "x-goog-api-key": apiKey };

  // Gemini returns 503 when a model is momentarily saturated: fall back across
  // models and retry with a short backoff before giving up.
  let upstream: Response | undefined;
  for (let attempt = 0; attempt < MODELS.length * 2; attempt++) {
    const model = MODELS[attempt % MODELS.length]!;
    upstream = await fetch(GOOGLE_ENDPOINT(model), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(body),
      signal: opts.signal ?? null,
    });
    if (upstream.ok && upstream.body) break;
    if (upstream.status !== 503 && upstream.status !== 429) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }

  if (!upstream || !upstream.ok || !upstream.body) {
    const message = await upstream?.text().catch(() => "");
    const status = upstream?.status ?? 500;
    const friendly =
      status === 401 || status === 403
        ? "Google AI rejected the credentials. Check the API key or its project permissions."
        : status === 429 || status === 503
          ? "Google AI is busy right now. Please retry in a moment."
          : message || `AI request failed (${status}).`;

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
        buffer += decoder.decode(value, { stream: true });
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
