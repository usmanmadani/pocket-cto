import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/github/pull")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const repoFullName = url.searchParams.get("repo");
        const branch = url.searchParams.get("branch") || "main";
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "");

        if (!token) {
          return new Response(JSON.stringify({ error: "Missing GitHub token" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!repoFullName) {
          return new Response(JSON.stringify({ error: "Missing repo parameter" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const headers = {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "Pocket-CTO-IDE",
        };

        try {
          // Fetch latest commits on branch
          const commitsRes = await fetch(
            `https://api.github.com/repos/${repoFullName}/commits?sha=${branch}&per_page=5`,
            { headers },
          );

          if (!commitsRes.ok) {
            const err = await commitsRes.text();
            return new Response(
              JSON.stringify({ error: `Failed to fetch branch status: ${err}` }),
              { status: commitsRes.status, headers: { "Content-Type": "application/json" } },
            );
          }

          const commits = (await commitsRes.json()) as Array<{
            sha: string;
            commit: {
              message: string;
              author: { name: string; date: string };
            };
            author?: { avatar_url: string; login: string };
            html_url: string;
          }>;

          const latest = commits[0];

          return new Response(
            JSON.stringify({
              success: true,
              branch,
              latestCommit: latest
                ? {
                    sha: latest.sha.slice(0, 7),
                    fullSha: latest.sha,
                    message: latest.commit.message,
                    author: latest.commit.author.name,
                    date: latest.commit.author.date,
                    avatarUrl: latest.author?.avatar_url,
                    url: latest.html_url,
                  }
                : null,
              recentCommits: commits.map((c) => ({
                sha: c.sha.slice(0, 7),
                message: c.commit.message,
                author: c.commit.author.name,
                date: c.commit.author.date,
              })),
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (err) {
          return new Response(
            JSON.stringify({ error: `GitHub pull check failed: ${String(err)}` }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
