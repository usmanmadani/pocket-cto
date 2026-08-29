import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/github/commit")({
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
          branch?: string;
          commitMessage?: string;
          files: { path: string; content: string }[];
        };

        const { repoFullName, files, commitMessage, branch = "main" } = body;

        if (!repoFullName || !files || !files.length) {
          return new Response(
            JSON.stringify({ error: "Missing repoFullName or files" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const headers = {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "Pocket-CTO-IDE",
          "Content-Type": "application/json",
        };

        try {
          // 1. Get branch reference to find latest commit SHA
          const refRes = await fetch(
            `https://api.github.com/repos/${repoFullName}/git/ref/heads/${branch}`,
            { headers },
          );

          if (!refRes.ok) {
            // Try default branch if specific branch fails
            const repoRes = await fetch(
              `https://api.github.com/repos/${repoFullName}`,
              { headers },
            );
            if (!repoRes.ok) {
              const err = await repoRes.text();
              return new Response(
                JSON.stringify({ error: `Repository lookup failed: ${err}` }),
                { status: repoRes.status, headers: { "Content-Type": "application/json" } },
              );
            }
          }

          const refData = (await refRes.json()) as { object?: { sha?: string } };
          const baseCommitSha = refData?.object?.sha;

          if (!baseCommitSha) {
            return new Response(
              JSON.stringify({ error: `Could not find base commit for branch ${branch}` }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          // 2. Get base tree SHA from base commit
          const commitRes = await fetch(
            `https://api.github.com/repos/${repoFullName}/git/commits/${baseCommitSha}`,
            { headers },
          );
          const commitData = (await commitRes.json()) as { tree?: { sha?: string } };
          const baseTreeSha = commitData?.tree?.sha;

          // 3. Create tree with files
          const treeItems = files.map((file) => ({
            path: file.path.replace(/^\//, ""),
            mode: "100644",
            type: "blob",
            content: file.content,
          }));

          const createTreeRes = await fetch(
            `https://api.github.com/repos/${repoFullName}/git/trees`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                base_tree: baseTreeSha,
                tree: treeItems,
              }),
            },
          );

          if (!createTreeRes.ok) {
            const err = await createTreeRes.text();
            return new Response(
              JSON.stringify({ error: `Failed to create Git tree: ${err}` }),
              { status: createTreeRes.status, headers: { "Content-Type": "application/json" } },
            );
          }

          const newTree = (await createTreeRes.json()) as { sha: string };

          // 4. Create new commit
          const msg =
            commitMessage ||
            `feat(spec): automated blueprint & architecture sync [Pocket CTO]`;

          const newCommitRes = await fetch(
            `https://api.github.com/repos/${repoFullName}/git/commits`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                message: msg,
                tree: newTree.sha,
                parents: [baseCommitSha],
              }),
            },
          );

          if (!newCommitRes.ok) {
            const err = await newCommitRes.text();
            return new Response(
              JSON.stringify({ error: `Failed to create Git commit: ${err}` }),
              { status: newCommitRes.status, headers: { "Content-Type": "application/json" } },
            );
          }

          const newCommit = (await newCommitRes.json()) as { sha: string; html_url: string };

          // 5. Update branch reference
          const updateRefRes = await fetch(
            `https://api.github.com/repos/${repoFullName}/git/refs/heads/${branch}`,
            {
              method: "PATCH",
              headers,
              body: JSON.stringify({
                sha: newCommit.sha,
                force: false,
              }),
            },
          );

          if (!updateRefRes.ok) {
            const err = await updateRefRes.text();
            return new Response(
              JSON.stringify({ error: `Failed to update branch ref: ${err}` }),
              { status: updateRefRes.status, headers: { "Content-Type": "application/json" } },
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              commitSha: newCommit.sha,
              commitUrl: newCommit.html_url || `https://github.com/${repoFullName}/commit/${newCommit.sha}`,
              filesCount: files.length,
              branch,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (err) {
          return new Response(
            JSON.stringify({ error: `Git commit operation failed: ${String(err)}` }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
