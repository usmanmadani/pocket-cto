import { createFileRoute } from "@tanstack/react-router";
import { streamArchitect } from "@/lib/ai-stream.server";

const INSTRUCTIONS = `You are the Lead Systems Architect & MIS Specialist Agent.
Analyze any software idea and extract precise technical requirements.

Think out loud in short, plain steps while you reason (analyzing domain and core entities,
identifying architectural bottlenecks, formulating technical & business scope questions).

Then output ONLY the JSON object matching the required schema, containing 8 to 10
multiple-choice survey questions covering at minimum:
- Target user persona & scale (B2B vs B2C, private vs public)
- Core functional modules
- Tenancy & data isolation model (single-tenant, shared DB with RLS, multi-DB)
- Integration & compliance needs (SMS, payments, biometrics, audit logs)
- Tech stack / hosting preference and UI style direction

Each question gets a relevant emoji icon and exactly 4 concise, mutually distinct options.`;

const FORMAT = {
  type: "json_schema" as const,
  name: "architect_survey",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["domain", "summary", "questions"],
    properties: {
      domain: { type: "string" },
      summary: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "icon", "question", "options"],
          properties: {
            id: { type: "string" },
            icon: { type: "string" },
            question: { type: "string" },
            options: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
};

export const Route = createFileRoute("/api/survey")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { idea } = (await request.json()) as { idea?: string };
        if (!idea || idea.trim().length < 3) {
          return new Response("Describe your software idea first.", { status: 400 });
        }
        return streamArchitect({
          instructions: INSTRUCTIONS,
          input: `Software idea: ${idea.trim()}`,
          format: FORMAT,
          effort: "medium",
          signal: request.signal,
        });
      },
    },
  },
});
