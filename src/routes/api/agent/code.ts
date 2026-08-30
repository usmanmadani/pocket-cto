import { createFileRoute } from "@tanstack/react-router";
import { streamArchitect } from "@/lib/ai-stream.server";

const MASTER_CODE_INSTRUCTIONS = `You are Pocket CTO AI — an Autonomous Principal AI Software Engineer, Technical Architect, and Collaborative Coding Partner.

Execute Phase 3: AUTONOMOUS PRODUCTION CODE EXECUTION based on the approved implementation plan.

STRICT OPERATIONAL RULES:
1. Complete Code Only: Write full, un-truncated, production-ready source code for every planned file. Strict prohibition against "// TODO", "// implement here", or omitted code blocks.
2. Comprehensive Screen Coverage: Ensure every page route, modal, layout, and domain branch defined in the plan is fully coded.
3. Design & Tech Stack Continuity: Match existing design systems (Tailwind CSS, React, Lucide Icons, Radix UI, TypeScript), typography, color palettes, and responsive mobile-first patterns.
4. Non-Destructive Refactoring: When modifying existing files, preserve all existing working models, configurations, and routes while surgically applying additions.
5. Multi-File Formatting: Demarcate every file with explicit delimiters:
===FILE: path/to/file.ext===
<full source code>

6. Static Reliability: Ensure all imports, exports, TypeScript interfaces, and SQL DDL tables (with RLS, UUID keys, foreign key indexes) are 100% syntactically correct and runnable.`;

export const Route = createFileRoute("/api/agent/code")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { approvedPlan, iterationPrompt, existingFiles, codebaseContext, userFlow } =
          (await request.json()) as {
            approvedPlan?: {
              title: string;
              summary: string;
              tasks: string[];
              affected_files: { path: string; action: string; purpose: string }[];
              architectural_decisions?: string[];
            };
            iterationPrompt?: string;
            existingFiles?: { name: string; content: string }[];
            codebaseContext?: { repoName: string; fileTree?: string[] };
            userFlow?: { title?: string; branches?: Array<{ name: string; steps: Array<{ title: string }> }> };
          };

        if (!approvedPlan && !iterationPrompt) {
          return new Response("Missing approvedPlan or iterationPrompt", { status: 400 });
        }

        const input = [
          `Approved Implementation Plan: ${approvedPlan?.title || "Full System Build"}`,
          `Summary: ${approvedPlan?.summary || iterationPrompt}`,
          "",
          "Planned Tasks Checklist:",
          ...(approvedPlan?.tasks?.map((t) => `- ${t}`) ?? []),
          "",
          "Target Files to Generate / Update:",
          ...(approvedPlan?.affected_files?.map((f) => `- [${f.action.toUpperCase()}] ${f.path} (${f.purpose})`) ?? []),
          "",
          ...(approvedPlan?.architectural_decisions?.length
            ? ["Architectural Decisions:", ...approvedPlan.architectural_decisions.map((d) => `- ${d}`), ""]
            : []),
          "Existing Base Files Context:",
          ...(existingFiles ?? []).map(
            (f) => `--- FILE: ${f.name} ---\n${f.content.slice(0, 18000)}\n--- END ---`,
          ),
          "",
          "Execute the full code generation now. Output complete, production-ready source files delimited by ===FILE: path/to/file.ext=== markers.",
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
