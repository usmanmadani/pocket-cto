import { createFileRoute } from "@tanstack/react-router";
import { streamArchitect } from "@/lib/ai-stream.server";

const MASTER_PLAN_INSTRUCTIONS = `You are Pocket CTO AI — an Autonomous Principal AI Software Engineer, Technical Architect, and Collaborative Coding Partner.

Your objective is to produce a comprehensive, reviewable IMPLEMENTATION PLAN for building the entire full-stack software system without omitting any screen or requirement:

1. COMPREHENSIVE PAGE & FEATURE COVERAGE:
   - Carefully ingest the entire User Flow Navigation Tree (Entry -> Splash -> Auth Decision -> Central Hub -> All Domain Feature Branches -> Sub-screens/Actions).
   - Ensure EVERY SINGLE page, sub-screen, modal, API endpoint, and database table specified in the architecture and user flow is accounted for in the implementation plan.

2. DEEP PRE-EXECUTION CODEBASE ANALYSIS (FOR EXISTING GITHUB PROJECTS):
   - When a connected repository context is provided, analyze the existing schemas, routing structure, styling tokens, and packages.
   - Plan surgical additions and updates that seamlessly integrate with existing code while preserving untouched user logic.

3. STRUCTURED DELIVERABLES:
   - Summary of Intent: Concise overview of the full system build.
   - Step-by-Step Task Checklist: Ordered technical roadmap covering database, auth, layouts, page routes, and state logic.
   - Affected Files: Explicit file paths marked as [create], [update], or [delete] with exact architectural purpose.
   - Architectural Decisions: State management, auth guard model, API conventions, and styling tokens.

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
        const {
          iterationPrompt,
          currentFiles,
          codebaseContext,
          userFlow,
          blueprintSummary,
          answers,
        } = (await request.json()) as {
          iterationPrompt?: string;
          currentFiles?: { name: string; content: string }[];
          codebaseContext?: {
            repoName: string;
            fileTree?: string[];
            tables?: string[];
            routes?: string[];
          };
          userFlow?: {
            title?: string;
            entry?: unknown;
            hub?: unknown;
            branches?: Array<{
              name: string;
              steps: Array<{ title: string; subtitle: string }>;
            }>;
          };
          blueprintSummary?: string;
          answers?: { question: string; answer: string }[];
        };

        if (!iterationPrompt && !userFlow) {
          return new Response("Missing iterationPrompt or userFlow", { status: 400 });
        }

        const filesSummary = (currentFiles ?? [])
          .map((f) => `- ${f.name} (${f.content.length} bytes)`)
          .join("\n");

        let userFlowSummary = "";
        if (userFlow?.branches) {
          userFlowSummary = [
            `User Flow Navigation Map: ${userFlow.title || "Full System"}`,
            ...userFlow.branches.map(
              (b) =>
                `  • Feature Branch [${b.name}]: ${b.steps?.map((s) => s.title).join(" -> ")}`,
            ),
          ].join("\n");
        }

        const input = [
          `Build / Iteration Goal: ${iterationPrompt || "Synthesize complete full-stack application with all screens and database models"}`,
          "",
          `Existing Blueprint Architecture: ${blueprintSummary || "Pocket CTO Master Specification"}`,
          "",
          ...(userFlowSummary ? ["--- USER FLOW NAVIGATION SPECIFICATION ---", userFlowSummary, ""] : []),
          ...(codebaseContext?.repoName
            ? [
                `--- CONNECTED GITHUB REPOSITORY: ${codebaseContext.repoName} ---`,
                codebaseContext.fileTree?.length
                  ? `Existing File Tree: ${codebaseContext.fileTree.slice(0, 50).join(", ")}`
                  : "",
                codebaseContext.tables?.length
                  ? `Existing DB Tables: ${codebaseContext.tables.join(", ")}`
                  : "",
                "",
              ]
            : []),
          "--- CURRENT WORKSPACE ARTIFACTS ---",
          filesSummary || "None",
          "",
          "Now formulate a comprehensive implementation plan that guarantees 100% feature coverage of all pages, transitions, database relationships, and API endpoints.",
        ].join("\n");

        return streamArchitect({
          instructions: MASTER_PLAN_INSTRUCTIONS,
          input,
          format: FORMAT,
          effort: "high",
          signal: request.signal,
        });
      },
    },
  },
});
