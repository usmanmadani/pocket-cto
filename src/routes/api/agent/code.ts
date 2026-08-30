import { createFileRoute } from "@tanstack/react-router";
import { streamArchitect } from "@/lib/ai-stream.server";

const MASTER_CODE_INSTRUCTIONS = `You are Pocket CTO AI — an Autonomous Principal AI Software Engineer, Technical Architect, and Collaborative Coding Partner.

Execute Phase 3: AUTONOMOUS PRODUCTION CODE EXECUTION based on the approved implementation plan.

STRICT OPERATIONAL RULES:
1. Complete Code Only: Write full, un-truncated, production-ready source code. Strict prohibition against "// TODO", "// implement here", or omitted code blocks.
2. Design & Tech Stack Continuity: Match existing design systems (Tailwind CSS, React 19, Lucide Icons, Radix UI, TanStack Router), typography, color palettes, and component patterns.
3. Multi-File Formatting: Demarcate every file with explicit delimiters:
===FILE: path/to/file.ext===
<full source code>

4. Self-Linting: Ensure all imports, exports, interfaces, SQL DDL tables (with RLS, UUID keys, foreign key indexes), and client hooks are 100% syntactically correct and runnable.`;

export const Route = createFileRoute("/api/agent/code")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { approvedPlan, iterationPrompt, existingFiles, codebaseContext } =
          (await request.json()) as {
            approvedPlan?: {
              title: string;
              summary: string;
              tasks: string[];
              affected_files: { path: string; action: string; purpose: string }[];
            };
            iterationPrompt?: string;
            existingFiles?: { name: string; content: string }[];
            codebaseContext?: { repoName: string };
          };

        if (!approvedPlan && !iterationPrompt) {
          return new Response("Missing approvedPlan or iterationPrompt", { status: 400 });
        }

        const input = [
          `Approved Implementation Plan: ${approvedPlan?.title || "Feature Implementation"}`,
          `Summary: ${approvedPlan?.summary || iterationPrompt}`,
          "",
          "Planned Tasks:",
          ...(approvedPlan?.tasks?.map((t) => `- ${t}`) ?? []),
          "",
          "Target Files to Generate / Update:",
          ...(approvedPlan?.affected_files?.map((f) => `- [${f.action}] ${f.path} (${f.purpose})`) ?? []),
          "",
          "Existing Base Files Context:",
          ...(existingFiles ?? []).map(
            (f) => `--- FILE: ${f.name} ---\n${f.content.slice(0, 15000)}\n--- END ---`,
          ),
          "",
          "Now execute the code generation. Output complete, production-ready files delimited by ===FILE: path/to/file.ext=== markers.",
        ].join("\n");

        return streamArchitect({
          instructions: MASTER_CODE_INSTRUCTIONS,
          input,
          effort: "high",
          signal: request.signal,
        });
      },
    },
  },
});
