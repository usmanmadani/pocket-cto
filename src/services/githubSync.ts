export interface GitSyncOptions {
  githubToken: string;
  owner: string;
  repo: string;
  branch: string;
  commitMessage: string;
  files: { path: string; content: string }[];
}

export class GitHubSyncEngine {
  private static BASE_URL = "https://api.github.com";

  private static headers(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "Pocket-CTO-Deployer",
    };
  }

  static async commitAndPushFiles(options: GitSyncOptions): Promise<{ commitSha: string }> {
    const headers = this.headers(options.githubToken);

    // 1. Get current branch reference commit
    const refRes = await fetch(
      `${this.BASE_URL}/repos/${options.owner}/${options.repo}/git/ref/heads/${options.branch}`,
      { headers },
    );
    if (!refRes.ok) {
      throw new Error(`Failed to fetch branch ref heads/${options.branch}: ${refRes.statusText}`);
    }
    const refData = (await refRes.json()) as { object: { sha: string } };
    const latestCommitSha = refData.object.sha;

    // 2. Create Blobs for each updated/created file
    const treePayload = await Promise.all(
      options.files.map(async (f) => {
        const blobRes = await fetch(
          `${this.BASE_URL}/repos/${options.owner}/${options.repo}/git/blobs`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              content: f.content,
              encoding: "utf-8",
            }),
          },
        );
        if (!blobRes.ok) {
          throw new Error(`Failed to create blob for ${f.path}`);
        }
        const blobData = (await blobRes.json()) as { sha: string };
        return {
          path: f.path.replace(/^\//, ""),
          mode: "100644",
          type: "blob",
          sha: blobData.sha,
        };
      }),
    );

    // 3. Create Tree
    const treeRes = await fetch(
      `${this.BASE_URL}/repos/${options.owner}/${options.repo}/git/trees`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          base_tree: latestCommitSha,
          tree: treePayload,
        }),
      },
    );
    if (!treeRes.ok) {
      throw new Error(`Failed to create git tree`);
    }
    const treeData = (await treeRes.json()) as { sha: string };

    // 4. Create Commit
    const commitRes = await fetch(
      `${this.BASE_URL}/repos/${options.owner}/${options.repo}/git/commits`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: options.commitMessage,
          tree: treeData.sha,
          parents: [latestCommitSha],
        }),
      },
    );
    if (!commitRes.ok) {
      throw new Error(`Failed to create git commit`);
    }
    const commitData = (await commitRes.json()) as { sha: string };

    // 5. Update Branch Head Ref
    const updateRes = await fetch(
      `${this.BASE_URL}/repos/${options.owner}/${options.repo}/git/refs/heads/${options.branch}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          sha: commitData.sha,
          force: false,
        }),
      },
    );
    if (!updateRes.ok) {
      throw new Error(`Failed to update branch ref heads/${options.branch}`);
    }

    return { commitSha: commitData.sha };
  }
}
