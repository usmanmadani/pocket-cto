import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ping")({
  server: {
    handlers: {
      GET: async () => {
        const enc = new TextEncoder();
        let i = 0;
        const stream = new ReadableStream({
          async pull(controller) {
            if (i++ > 3) return controller.close();
            controller.enqueue(enc.encode(`data: ${i}\n\n`));
            await new Promise((r) => setTimeout(r, 300));
          },
        });
        return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
      },
    },
  },
});
