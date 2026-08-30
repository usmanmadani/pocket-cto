import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/github/create-repo")({
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
          name: string;
          description?: string;
          isPrivate?: boolean;
          autoInit?: boolean;
        };

        const { name, description, isPrivate = false } = body;

        if (!name || !name.trim()) {
          return new Response(JSON.stringify({ error: "Repository name is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const headers = {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "Pocket-CTO-Master-Agent",
          "Content-Type": "application/json",
        };

        try {
          // 1. Create the repository on GitHub
          const createRes = await fetch("https://api.github.com/user/repos", {
            method: "POST",
            headers,
            body: JSON.stringify({
              name: name.trim().toLowerCase().replace(/\s+/g, "-"),
              description:
                description ||
                "Full-stack software engineered and deployed autonomously by Pocket CTO AI",
              private: isPrivate,
              auto_init: true,
            }),
          });

          if (!createRes.ok) {
            const err = await createRes.text();
            return new Response(
              JSON.stringify({ error: `GitHub repository creation failed: ${err}` }),
              { status: createRes.status, headers: { "Content-Type": "application/json" } },
            );
          }

          const repoData = (await createRes.json()) as {
            name: string;
            full_name: string;
            html_url: string;
            default_branch: string;
            private: boolean;
          };

          return new Response(
            JSON.stringify({
              success: true,
              repoName: repoData.name,
              repoFullName: repoData.full_name,
              repoUrl: repoData.html_url,
              defaultBranch: repoData.default_branch || "main",
              isPrivate: repoData.private,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (err) {
          return new Response(
            JSON.stringify({ error: `Repository creation failed: ${String(err)}` }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
