import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/github/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        const headerToken = authHeader?.replace(/^Bearer\s+/i, "").trim();

        const body = (await request.json()) as {
          owner?: string;
          repo?: string;
          defaultBranch?: string;
          token?: string;
        };

        const token = body.token || headerToken;
        const { owner, repo, defaultBranch = "main" } = body;

        if (!owner || !repo) {
          return new Response(
            JSON.stringify({ error: "Missing required fields: owner and repo" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const headers: Record<string, string> = {
          Accept: "application/vnd.github+json",
          "User-Agent": "Pocket-CTO-SpecEngine",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        try {
          // 1. Fetch Repository Git Tree
          const treeRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
            { headers },
          );

          if (!treeRes.ok) {
            const err = await treeRes.text();
            return new Response(
              JSON.stringify({ error: `Failed to fetch repo tree: ${err}` }),
              { status: treeRes.status, headers: { "Content-Type": "application/json" } },
            );
          }

          const treeData = (await treeRes.json()) as {
            tree?: Array<{ path: string; type: string; size?: number }>;
            truncated?: boolean;
          };

          const allItems = (treeData.tree ?? []).filter((item) => item.type === "blob");
          const fileTree = allItems.map((item) => item.path);

          // 2. Identify key architectural files (migrations, schema, config, package files)
          const isKeyArchitecturalFile = (path: string) => {
            const lower = path.toLowerCase();
            if (
              lower.includes("node_modules/") ||
              lower.includes(".git/") ||
              lower.includes("dist/") ||
              lower.includes("build/") ||
              lower.includes(".next/")
            ) {
              return false;
            }

            return (
              lower.includes("migration") ||
              lower.includes("schema") ||
              lower.endsWith(".prisma") ||
              lower.endsWith(".sql") ||
              lower.endsWith("package.json") ||
              lower.endsWith("requirements.txt") ||
              lower.endsWith("composer.json") ||
              lower.endsWith("cargo.toml") ||
              lower.endsWith("go.mod") ||
              lower.endsWith(".env.example") ||
              lower.endsWith("docker-compose.yml") ||
              lower.endsWith("docker-compose.yaml") ||
              lower.endsWith("drizzle.config.ts")
            );
          };

          const targetFiles = allItems
            .filter((item) => isKeyArchitecturalFile(item.path))
            // Prioritize schema and migration files, then package files
            .sort((a, b) => {
              const score = (p: string) => {
                const lp = p.toLowerCase();
                if (lp.includes("schema") || lp.endsWith(".prisma")) return 10;
                if (lp.includes("migration") || lp.endsWith(".sql")) return 9;
                if (lp.endsWith("package.json") || lp.endsWith("cargo.toml")) return 8;
                return 5;
              };
              return score(b.path) - score(a.path);
            })
            .slice(0, 10);

          // 3. Read content of key files
          const keyFiles = await Promise.all(
            targetFiles.map(async (file) => {
              try {
                const contentRes = await fetch(
                  `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${encodeURIComponent(defaultBranch)}`,
                  { headers },
                );
                if (!contentRes.ok) return null;
                const contentData = (await contentRes.json()) as {
                  content?: string;
                  encoding?: string;
                };

                let content = "";
                if (contentData.content && contentData.encoding === "base64") {
                  content = Buffer.from(contentData.content, "base64").toString("utf-8");
                } else if (contentData.content) {
                  content = contentData.content;
                }

                // Truncate very large single files (e.g. max 15,000 chars each) to protect token budget
                if (content.length > 15000) {
                  content = content.slice(0, 15000) + "\n\n... [truncated for architect context]";
                }

                return { path: file.path, content };
              } catch {
                return null;
              }
            }),
          );

          const validKeyFiles = keyFiles.filter(
            (f): f is { path: string; content: string } => f !== null && Boolean(f.content),
          );

          return new Response(
            JSON.stringify({
              success: true,
              codebaseContext: {
                repoName: `${owner}/${repo}`,
                defaultBranch,
                fileTree: fileTree.slice(0, 300), // Cap tree to top 300 files
                keyFiles: validKeyFiles,
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          return new Response(
            JSON.stringify({ error: `Sync failed: ${String(err)}` }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
