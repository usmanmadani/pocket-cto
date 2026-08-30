import { createFileRoute } from "@tanstack/react-router";
import { streamArchitect } from "@/lib/ai-stream.server";

const MASTER_PLAN_INSTRUCTIONS = `You are Pocket CTO AI — an Autonomous Principal AI Software Engineer, Technical Architect, and Collaborative Coding Partner.

You receive user requirements, iteration requests, or existing codebase context.
Your goal is to produce a structured, reviewable IMPLEMENTATION PLAN according to Phase 2 of the Pocket CTO protocol:

- Summary of Intent: Concise overview of what will be built or refactored.
- Step-by-Step Task Checklist: Ordered technical action items.
- Affected Files: Explicit file paths marked as [create], [update], or [delete] with exact purpose.
- Architectural Decisions: Key design patterns, state management, and schema choices.

Output strictly valid JSON matching the schema.`;

const FORMAT = {
  type: "json_schema" as const,
  name: "implementation_plan_artifact",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "summary", "tasks", "affected_files", "architectural_decisions"],
    properties: {
      title: { type: "string" },
      summary: { type: "string" },
      tasks: {
        type: "array",
        items: { type: "string" },
      },
      affected_files: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["path", "action", "purpose"],
          properties: {
            path: { type: "string" },
            action: { type: "string" },
            purpose: { type: "string" },
          },
        },
      },
      architectural_decisions: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
};

export const Route = createFileRoute("/api/agent/plan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { iterationPrompt, currentFiles, codebaseContext, userFlow, blueprintSummary } =
          (await request.json()) as {
            iterationPrompt?: string;
            currentFiles?: { name: string; content: string }[];
            codebaseContext?: { repoName: string; fileTree: string[] };
            userFlow?: unknown;
            blueprintSummary?: string;
          };

        if (!iterationPrompt) {
          return new Response("Missing iterationPrompt", { status: 400 });
        }

        const filesSummary = (currentFiles ?? [])
          .map((f) => `- ${f.name} (${f.content.length} chars)`)
          .join("\n");

        const input = [
          `User Feature / Iteration Request: ${iterationPrompt}`,
          "",
          `Existing Blueprint Summary: ${blueprintSummary || "Initial System Specification"}`,
          ...(codebaseContext?.repoName
            ? [`Connected GitHub Repo: ${codebaseContext.repoName}`]
            : []),
          "",
          "Current Workspace Files:",
          filesSummary || "None",
          "",
          "Synthesize a surgical, step-by-step implementation plan for autonomous code generation.",
        ].join("\n");

        return streamArchitect({
          instructions: MASTER_PLAN_INSTRUCTIONS,
          input,
          format: FORMAT,
          effort: "medium",
          signal: request.signal,
        });
      },
    },
  },
});
