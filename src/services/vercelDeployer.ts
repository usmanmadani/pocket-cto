export interface VercelFilePayload {
  file: string;
  data: string;
  encoding?: "utf-8" | "base64";
}

export interface DeploymentConfig {
  projectName: string;
  vercelToken: string;
  teamId?: string;
  envVariables: Record<string, string>;
  files: VercelFilePayload[];
}

export class VercelDeployer {
  private static BASE_URL = "https://api.vercel.com";

  /**
   * Deploys in-memory files directly to Vercel and injects environment variables
   */
  static async deployProject(
    config: DeploymentConfig,
  ): Promise<{ deploymentId: string; previewUrl: string; status: string }> {
    const url = new URL(`${this.BASE_URL}/v13/deployments`);
    if (config.teamId) {
      url.searchParams.append("teamId", config.teamId);
    }

    // Sanitize project name for Vercel
    const cleanProjectName = config.projectName
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "pocket-cto-project";

    // Ensure package.json and index.html exist if not present in files
    const fileList = [...config.files];
    const hasPackageJson = fileList.some((f) => f.file === "package.json");
    if (!hasPackageJson) {
      fileList.push({
        file: "package.json",
        data: JSON.stringify(
          {
            name: cleanProjectName,
            private: true,
            version: "0.0.0",
            type: "module",
            scripts: {
              dev: "vite",
              build: "vite build",
              preview: "vite preview",
            },
            dependencies: {
              react: "^18.3.1",
              "react-dom": "^18.3.1",
              "lucide-react": "^0.460.0",
              clsx: "^2.1.1",
              "tailwind-merge": "^2.5.4",
              "@supabase/supabase-js": "^2.46.1",
            },
            devDependencies: {
              "@vitejs/plugin-react": "^4.3.3",
              vite: "^5.4.10",
              tailwindcss: "^3.4.15",
              autoprefixer: "^10.4.20",
              postcss: "^8.4.49",
            },
          },
          null,
          2,
        ),
      });
    }

    const payload = {
      name: cleanProjectName,
      files: fileList,
      projectSettings: {
        framework: "vite",
        buildCommand: "npm run build",
        outputDirectory: "dist",
      },
      env: config.envVariables,
    };

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Vercel Deployment Failed (${response.status}): ${JSON.stringify(err)}`);
    }

    const data = (await response.json()) as {
      id: string;
      url: string;
      readyState?: string;
    };

    return {
      deploymentId: data.id,
      previewUrl: `https://${data.url}`,
      status: data.readyState || "BUILDING",
    };
  }
}
