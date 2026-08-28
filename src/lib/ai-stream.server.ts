const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";

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

/**
 * Calls the Lovable AI Gateway Responses API and re-streams it as a simple
 * SSE feed of `{ type: "thought" | "text" | "error" | "done", value }` events.
 */
export async function streamArchitect(opts: StreamOptions): Promise<Response> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return new Response("Missing LOVABLE_API_KEY", { status: 500 });
  }

  const body: Body = {
    model: MODEL,
    input: opts.input,
    instructions: opts.instructions,
    stream: true,
    store: false,
    reasoning: { effort: opts.effort ?? "medium", summary: "auto" },
    include: ["reasoning.encrypted_content"],
  };
  if (opts.format) body["text"] = { format: opts.format };

  console.log("[architect] calling gateway");
  const upstream = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!upstream.ok || !upstream.body) {
    const message = await upstream.text().catch(() => "");
    const status = upstream.status;
    const friendly =
      status === 402
        ? "AI credits are exhausted for this workspace. Add credits in Lovable to continue."
        : status === 429
          ? "The AI service is rate limited right now. Please retry in a moment."
          : message || `AI request failed (${status}).`;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encodeEvent({ type: "error", value: friendly }));
        controller.close();
      },
    });
    return sse(stream);
  }

  console.log("[architect] upstream ok", upstream.status);
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      console.log("[architect] read", done, value?.length);
      if (done) {
        controller.enqueue(encodeEvent({ type: "done" }));
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let evt: { type?: string; delta?: string; response?: { error?: { message?: string } } };
          try {
            evt = JSON.parse(payload);
          } catch {
            continue;
          }
          if (evt.type === "response.reasoning_summary_text.delta" && evt.delta) {
            controller.enqueue(encodeEvent({ type: "thought", value: evt.delta }));
          } else if (evt.type === "response.output_text.delta" && evt.delta) {
            controller.enqueue(encodeEvent({ type: "text", value: evt.delta }));
          } else if (evt.type === "response.failed" || evt.type === "error") {
            controller.enqueue(
              encodeEvent({
                type: "error",
                value: evt.response?.error?.message ?? "Generation failed.",
              }),
            );
          }
        }
      }
    },
    cancel() {
      void reader.cancel();
    },
  });

  return sse(stream);
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
