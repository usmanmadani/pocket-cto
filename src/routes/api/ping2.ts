import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/ping2")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        console.log("[ping2]", body);
        return new Response(JSON.stringify({ ok: true, body }));
      },
    },
  },
});
