import { createFileRoute } from "@tanstack/react-router";
import { streamArchitect } from "@/lib/ai-stream.server";

const INSTRUCTIONS = `You are the UI/UX Flow Architect Agent.
Analyze the user's product idea, domain, survey answers, and technical blueprint, then output a structured JSON representing the complete end-to-end user navigation flow:

1. Entry points (Start -> Splash Screen -> Auth Decision: Sign In / Sign Up)
2. Home / Main Dashboard Hub
3. 3-6 core domain feature branches tailored to the specific application
4. Sub-screens and concrete user action items for each branch with Lucide icon names, clean descriptions, and conversion highlights.

Produce valid JSON matching the schema strictly with high domain precision.`;

const FORMAT = {
  type: "json_schema" as const,
  name: "user_flow_diagram",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "subtitle", "entry", "hub", "branches"],
    properties: {
      title: { type: "string" },
      subtitle: { type: "string" },
      entry: {
        type: "object",
        additionalProperties: false,
        required: ["start", "splash", "decision", "auth_routes"],
        properties: {
          start: { type: "string" },
          splash: {
            type: "object",
            additionalProperties: false,
            required: ["title", "subtitle", "icon"],
            properties: {
              title: { type: "string" },
              subtitle: { type: "string" },
              icon: { type: "string" },
            },
          },
          decision: {
            type: "object",
            additionalProperties: false,
            required: ["title", "subtitle"],
            properties: {
              title: { type: "string" },
              subtitle: { type: "string" },
            },
          },
          auth_routes: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["type", "title", "subtitle", "icon", "color"],
              properties: {
                type: { type: "string" },
                title: { type: "string" },
                subtitle: { type: "string" },
                icon: { type: "string" },
                color: { type: "string" },
              },
            },
          },
        },
      },
      hub: {
        type: "object",
        additionalProperties: false,
        required: ["title", "subtitle", "icon"],
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          icon: { type: "string" },
        },
      },
      branches: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "color", "icon", "steps"],
          properties: {
            name: { type: "string" },
            color: { type: "string" },
            icon: { type: "string" },
            steps: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["title", "subtitle", "icon", "highlight"],
                properties: {
                  title: { type: "string" },
                  subtitle: { type: "string" },
                  icon: { type: "string" },
                  highlight: { type: "boolean" },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const Route = createFileRoute("/api/user-flow")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { idea, domain, answers, blueprint, codebaseContext } =
          (await request.json()) as {
            idea?: string;
            domain?: string;
            answers?: { question: string; answer: string }[];
            blueprint?: string;
            codebaseContext?: {
              repoName: string;
            };
          };

        if (!idea) return new Response("Missing idea", { status: 400 });

        const answerBlock = (answers ?? [])
          .map((a) => `- ${a.question} => ${a.answer}`)
          .join("\n");

        return streamArchitect({
          instructions: INSTRUCTIONS,
          input: [
            `Product Idea: ${idea}`,
            `Domain: ${domain ?? "Software SaaS"}`,
            ...(codebaseContext?.repoName
              ? [`Connected Repository: ${codebaseContext.repoName}`]
              : []),
            "",
            "Survey Scope Decisions:",
            answerBlock,
            "",
            "Architecture Context Summary:",
            (blueprint ?? "").slice(0, 40000),
          ].join("\n"),
          format: FORMAT,
          effort: "medium",
          signal: request.signal,
        });
      },
    },
  },
});
