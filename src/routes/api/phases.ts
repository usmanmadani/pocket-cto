import { createFileRoute } from "@tanstack/react-router";
import { streamArchitect } from "@/lib/ai-stream.server";

const INSTRUCTIONS = `You are the Build Prompt Sequencer. You already know the user's product idea,
survey answers and full technical blueprint. Your job is to turn that blueprint into an ordered
sequence of copy-paste prompts that a person can paste, one at a time, into an AI app builder
(Lovable, Cursor, Windsurf, v0, Bolt) to build the ENTIRE product section by section.

Rules:
- Produce between 10 and 20 phases. Each phase builds exactly one coherent section/feature and
  leaves the app in a working state. Order matters: foundation & design system, data model & auth,
  then feature modules, then dashboards/reporting, then polish, QA and launch.
- Each prompt must be SELF-CONTAINED: restate the product context in one line, name the exact
  files/tables/components to create, describe the UI layout and states, the data operations, the
  edge cases, and end with an "Acceptance criteria" checklist.
- Prompts are addressed directly to the AI builder in second person ("Build...", "Add...").
  No meta commentary, no placeholders, no TODOs. Be concrete and opinionated.
- Reuse the exact table, column, route and component names from the blueprint.

Stream concise reasoning while you work, then output ONLY the phases in this exact format,
with no text before, between or after them other than the markers:

===PHASE 1 :: Short phase title :: One-line outcome of this phase===
<the full copy-paste prompt for phase 1>
===PHASE 2 :: Short phase title :: One-line outcome of this phase===
<the full copy-paste prompt for phase 2>
`;

export const Route = createFileRoute("/api/phases")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { idea, domain, answers, blueprint } = (await request.json()) as {
          idea?: string;
          domain?: string;
          answers?: { question: string; answer: string }[];
          blueprint?: string;
        };
        if (!idea) return new Response("Missing idea", { status: 400 });

        const answerBlock = (answers ?? [])
          .map((a) => `- ${a.question} => ${a.answer}`)
          .join("\n");

        return streamArchitect({
          instructions: INSTRUCTIONS,
          input: [
            `Software idea: ${idea}`,
            `Domain: ${domain ?? "unspecified"}`,
            "",
            "Survey answers:",
            answerBlock,
            "",
            "Approved blueprint:",
            (blueprint ?? "").slice(0, 120000),
          ].join("\n"),
          effort: "medium",
          signal: request.signal,
        });
      },
    },
  },
});
