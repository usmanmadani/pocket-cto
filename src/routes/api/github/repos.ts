import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/github/repos")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

        if (!token) {
          return new Response(JSON.stringify({ error: "Unauthorized: Missing GitHub token" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const headers = {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "User-Agent": "Pocket-CTO-SpecEngine",
          };

          const [userRes, reposRes] = await Promise.all([
            fetch("https://api.github.com/user", { headers }),
            fetch(
              "https://api.github.com/user/repos?sort=updated&per_page=60&affiliation=owner,collaborator",
              { headers },
            ),
          ]);

          if (!userRes.ok) {
            const err = await userRes.text();
            return new Response(
              JSON.stringify({ error: `GitHub user fetch failed: ${err}` }),
              { status: userRes.status, headers: { "Content-Type": "application/json" } },
            );
          }

          if (!reposRes.ok) {
            const err = await reposRes.text();
            return new Response(
              JSON.stringify({ error: `GitHub repos fetch failed: ${err}` }),
              { status: reposRes.status, headers: { "Content-Type": "application/json" } },
            );
          }

          const user = (await userRes.json()) as {
            login: string;
            avatar_url: string;
            name?: string;
            html_url?: string;
          };

          const rawRepos = (await reposRes.json()) as Array<{
            id: number;
            name: string;
            full_name: string;
            private: boolean;
            html_url: string;
            description: string | null;
            default_branch: string;
            language: string | null;
            updated_at: string;
            owner: { login: string; avatar_url: string };
          }>;

          const repos = rawRepos.map((r) => ({
            id: r.id,
            name: r.name,
            full_name: r.full_name,
            private: r.private,
            html_url: r.html_url,
            description: r.description,
            default_branch: r.default_branch || "main",
            language: r.language,
            updated_at: r.updated_at,
            owner: {
              login: r.owner.login,
              avatar_url: r.owner.avatar_url,
            },
          }));

          return new Response(JSON.stringify({ user, repos }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ error: `Failed to fetch repos: ${String(err)}` }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
