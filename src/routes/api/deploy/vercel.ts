import { createFileRoute } from "@tanstack/react-router";
import { executeProjectDeploymentFlow, type OrchestrationRequest } from "@/services/projectOrchestrator";

export const Route = createFileRoute("/api/deploy/vercel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as OrchestrationRequest;

          // Default fallback token from server env if user didn't pass custom token
          const token =
            body.vercelToken ||
            process.env["VERCEL_TOKEN"] ||
            process.env["VERCEL_AUTH_TOKEN"] ||
            process.env["VITE_VERCEL_TOKEN"];

          if (!token) {
            return new Response(
              JSON.stringify({
                error:
                  "Missing Vercel Token. Please provide your Vercel Access Token to deploy the live preview.",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const result = await executeProjectDeploymentFlow({
            ...body,
            vercelToken: token,
          });

          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("Vercel deployment failed:", err);
          return new Response(
            JSON.stringify({
              error: err?.message || "Vercel deployment failed",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
