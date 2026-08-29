import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/github/pr")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "");

        if (!token) {
          return new Response(JSON.stringify({ error: "Missing GitHub token" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const body = (await request.json()) as {
          repoFullName: string;
          title: string;
          body?: string;
          headBranch: string;
          baseBranch?: string;
        };

        const {
          repoFullName,
          title,
          body: prBody,
          headBranch,
          baseBranch = "main",
        } = body;

        if (!repoFullName || !title || !headBranch) {
          return new Response(
            JSON.stringify({ error: "Missing repoFullName, title, or headBranch" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const headers = {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "Pocket-CTO-IDE",
          "Content-Type": "application/json",
        };

        try {
          // Create Pull Request
          const prRes = await fetch(
            `https://api.github.com/repos/${repoFullName}/pulls`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                title,
                body:
                  prBody ||
                  "### 🚀 Automated Blueprint Sync by Pocket CTO\n\nThis Pull Request contains verified architectural blueprints, normalized schema DDL, user flow navigation specifications, and step-by-step build prompts.",
                head: headBranch,
                base: baseBranch,
              }),
            },
          );

          if (!prRes.ok) {
            const err = await prRes.text();
            return new Response(
              JSON.stringify({ error: `Pull Request creation failed: ${err}` }),
              { status: prRes.status, headers: { "Content-Type": "application/json" } },
            );
          }

          const prData = (await prRes.json()) as {
            number: number;
            html_url: string;
            state: string;
            mergeable?: boolean;
          };

          return new Response(
            JSON.stringify({
              success: true,
              prNumber: prData.number,
              prUrl: prData.html_url,
              state: prData.state,
              mergeable: prData.mergeable ?? true,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (err) {
          return new Response(
            JSON.stringify({ error: `GitHub PR request failed: ${String(err)}` }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
