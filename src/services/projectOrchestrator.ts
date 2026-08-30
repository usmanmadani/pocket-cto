import { SupabaseTenantManager, type SupabaseTenantCredentials } from "./supabaseProvisioner";
import { VercelDeployer, type VercelFilePayload } from "./vercelDeployer";
import { GitHubSyncEngine } from "./githubSync";

export interface OrchestrationRequest {
  projectId?: string;
  projectName: string;
  generatedFiles: { path: string; content: string }[];
  sqlMigrations: string[];
  supabaseCredentials?: SupabaseTenantCredentials;
  vercelToken: string;
  teamId?: string | undefined;
  githubConfig?: {
    token: string;
    owner: string;
    repo: string;
    branch: string;
  };
}

export interface OrchestrationResult {
  status: "success" | "error";
  previewUrl: string;
  deploymentId: string;
  databaseReady: boolean;
  gitCommitSha?: string | undefined;
  migrationCount: number;
}

export async function executeProjectDeploymentFlow(
  req: OrchestrationRequest,
): Promise<OrchestrationResult> {
  let migrationCount = 0;

  // Step 1: Run Tenant Database Migrations if Supabase is provided
  if (req.supabaseCredentials?.supabaseUrl && req.supabaseCredentials?.anonKey) {
    const migrationRes = await SupabaseTenantManager.runTenantMigrations(
      req.supabaseCredentials,
      req.sqlMigrations,
    );
    migrationCount = migrationRes.executedCount;
  }

  // Step 2: Inject .env file into generated files if Supabase is connected
  const allFiles = [...req.generatedFiles];
  if (req.supabaseCredentials?.supabaseUrl && req.supabaseCredentials?.anonKey) {
    const envContent = [
      `VITE_SUPABASE_URL=${req.supabaseCredentials.supabaseUrl}`,
      `VITE_SUPABASE_ANON_KEY=${req.supabaseCredentials.anonKey}`,
    ].join("\n");

    const existingEnvIdx = allFiles.findIndex((f) => f.path === ".env" || f.path === ".env.local");
    if (existingEnvIdx >= 0) {
      allFiles[existingEnvIdx].content += `\n${envContent}`;
    } else {
      allFiles.push({ path: ".env", content: envContent });
    }
  }

  // Step 3: Format files for Vercel Payload
  const vercelFiles: VercelFilePayload[] = allFiles.map((f) => ({
    file: f.path.replace(/^\//, ""),
    data: f.content,
  }));

  // Step 4: Trigger Programmatic Vercel Deployment with Supabase injected ENV
  const envVariables: Record<string, string> = {};
  if (req.supabaseCredentials?.supabaseUrl) {
    envVariables["VITE_SUPABASE_URL"] = req.supabaseCredentials.supabaseUrl;
  }
  if (req.supabaseCredentials?.anonKey) {
    envVariables["VITE_SUPABASE_ANON_KEY"] = req.supabaseCredentials.anonKey;
  }

  const vercelRes = await VercelDeployer.deployProject({
    projectName: req.projectName,
    vercelToken: req.vercelToken,
    teamId: req.teamId,
    files: vercelFiles,
    envVariables,
  });

  // Step 5: Optional Git Auto-Sync
  let gitCommitSha: string | undefined;
  if (req.githubConfig?.token && req.githubConfig?.owner && req.githubConfig?.repo) {
    try {
      const gitRes = await GitHubSyncEngine.commitAndPushFiles({
        githubToken: req.githubConfig.token,
        owner: req.githubConfig.owner,
        repo: req.githubConfig.repo,
        branch: req.githubConfig.branch || "main",
        commitMessage: `feat: deploy initial build for ${req.projectName} via Pocket CTO`,
        files: allFiles,
      });
      gitCommitSha = gitRes.commitSha;
    } catch (err) {
      console.warn("Git commit during orchestration skipped/failed:", err);
    }
  }

  return {
    status: "success",
    previewUrl: vercelRes.previewUrl,
    deploymentId: vercelRes.deploymentId,
    databaseReady: Boolean(req.supabaseCredentials?.supabaseUrl),
    gitCommitSha,
    migrationCount,
  };
}
