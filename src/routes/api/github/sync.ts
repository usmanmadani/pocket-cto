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
          // 1. Fetch Complete Repository Git Tree recursively
          const treeRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
            { headers },
          );

          if (!treeRes.ok) {
            const err = await treeRes.text();
            return new Response(
              JSON.stringify({ error: `Failed to fetch repository tree: ${err}` }),
              { status: treeRes.status, headers: { "Content-Type": "application/json" } },
            );
          }

          const treeData = (await treeRes.json()) as {
            tree?: Array<{ path: string; type: string; size?: number; sha: string }>;
            truncated?: boolean;
          };

          const allBlobs = (treeData.tree ?? []).filter((item) => item.type === "blob");
          const fileTree = allBlobs.map((item) => item.path);

          // 2. Filter out binaries, node_modules, lockfiles, and git cache
          const isSourceCodeFile = (path: string) => {
            const lower = path.toLowerCase();
            if (
              lower.includes("node_modules/") ||
              lower.includes(".git/") ||
              lower.includes("dist/") ||
              lower.includes("build/") ||
              lower.includes(".next/") ||
              lower.includes(".turbo/") ||
              lower.includes("coverage/") ||
              lower.endsWith("package-lock.json") ||
              lower.endsWith("yarn.lock") ||
              lower.endsWith("pnpm-lock.yaml") ||
              lower.endsWith(".png") ||
              lower.endsWith(".jpg") ||
              lower.endsWith(".jpeg") ||
              lower.endsWith(".gif") ||
              lower.endsWith(".svg") ||
              lower.endsWith(".ico") ||
              lower.endsWith(".woff") ||
              lower.endsWith(".woff2") ||
              lower.endsWith(".ttf") ||
              lower.endsWith(".eot") ||
              lower.endsWith(".pdf") ||
              lower.endsWith(".zip") ||
              lower.endsWith(".mp4")
            ) {
              return false;
            }

            return (
              lower.endsWith(".ts") ||
              lower.endsWith(".tsx") ||
              lower.endsWith(".js") ||
              lower.endsWith(".jsx") ||
              lower.endsWith(".css") ||
              lower.endsWith(".scss") ||
              lower.endsWith(".html") ||
              lower.endsWith(".json") ||
              lower.endsWith(".sql") ||
              lower.endsWith(".prisma") ||
              lower.endsWith(".md") ||
              lower.endsWith(".env") ||
              lower.endsWith(".env.example") ||
              lower.endsWith(".env.local") ||
              lower.endsWith(".yaml") ||
              lower.endsWith(".yml") ||
              lower.endsWith(".vue") ||
              lower.endsWith(".svelte") ||
              lower.endsWith(".py") ||
              lower.endsWith(".go") ||
              lower.endsWith(".rs") ||
              lower.endsWith(".php")
            );
          };

          // Prioritize important entry points, schemas, components, pages
          const candidateFiles = allBlobs
            .filter((item) => isSourceCodeFile(item.path))
            .sort((a, b) => {
              const score = (p: string) => {
                const lp = p.toLowerCase();
                if (lp === "package.json") return 100;
                if (lp.includes("schema") || lp.endsWith(".prisma") || lp.endsWith(".sql")) return 90;
                if (lp.includes("app") || lp.includes("index") || lp.includes("main") || lp.includes("root")) return 85;
                if (lp.includes("component") || lp.includes("footer") || lp.includes("header") || lp.includes("navbar")) return 80;
                if (lp.includes("route") || lp.includes("page")) return 75;
                return 50;
              };
              return score(b.path) - score(a.path);
            })
            // Fetch top 60 most relevant source files
            .slice(0, 60);

          // 3. Batch fetch file contents via raw blobs or contents API
          const fetchedFiles = await Promise.all(
            candidateFiles.map(async (file) => {
              try {
                // Fetch via raw user content or git blobs for fastest throughput
                const blobRes = await fetch(
                  `https://api.github.com/repos/${owner}/${repo}/git/blobs/${file.sha}`,
                  { headers },
                );
                if (!blobRes.ok) return null;
                const blobData = (await blobRes.json()) as { content?: string; encoding?: string };

                let content = "";
                if (blobData.content && blobData.encoding === "base64") {
                  content = Buffer.from(blobData.content, "base64").toString("utf-8");
                } else if (blobData.content) {
                  content = blobData.content;
                }

                // Protect token limits for gigantic files
                if (content.length > 25000) {
                  content = content.slice(0, 25000);
                }

                return { name: file.path, content };
              } catch {
                return null;
              }
            }),
          );

          const validClonedFiles = fetchedFiles.filter(
            (f): f is { name: string; content: string } => f !== null && Boolean(f.content),
          );

          return new Response(
            JSON.stringify({
              success: true,
              clonedFilesCount: validClonedFiles.length,
              allFiles: validClonedFiles,
              codebaseContext: {
                repoName: `${owner}/${repo}`,
                defaultBranch,
                fileTree: fileTree.slice(0, 300),
                keyFiles: validClonedFiles.slice(0, 15).map((f) => ({
                  path: f.name,
                  content: f.content,
                })),
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          return new Response(
            JSON.stringify({ error: `Repository clone sync failed: ${String(err)}` }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
