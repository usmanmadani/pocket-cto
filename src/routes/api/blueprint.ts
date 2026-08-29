import { createFileRoute } from "@tanstack/react-router";
import { streamArchitect } from "@/lib/ai-stream.server";

const INSTRUCTIONS = `You are the Master Blueprint Compiler. You take a software idea plus the
user's survey answers and produce ready-to-implement specification files.

Stream concise reasoning while you work, then output the five deliverables below as plain text.
Separate every file with a line of exactly this shape and nothing else:

===FILE: <filename>===

Produce exactly these files, in this order:

1. README.md — executive overview, problem statement, personas, RBAC matrix table,
   core feature modules, edge cases, non-goals.
2. SYSTEM_ARCHITECTURE.md — mermaid block diagram, mermaid user-flow diagrams, recommended tech
   stack with exact rationale (backend, frontend, database, auth, storage, hosting), and a design
   system token table (primary/secondary/accent colors in hex, typography pairing, radii, spacing).
   Use \`\`\`mermaid fenced blocks with valid syntax and no emojis inside diagrams.
3. DATABASE_SCHEMA.sql — fully normalized PostgreSQL DDL: UUID primary keys, foreign keys,
   constraints, indexes, GRANTs, ENABLE ROW LEVEL SECURITY and concrete RLS policies per table.
4. AI_BUILDER_PROMPTS.md — modular copy-paste prompts for Cursor / Windsurf / v0.dev / Lovable that
   build the app step by step; each prompt self-contained with explicit file paths and acceptance criteria.
5. IMPLEMENTATION_ROADMAP.md — Phase 1 MVP core (data models + auth), Phase 2 feature modules &
   business logic, Phase 3 reporting, exports & hardening; with tasks, estimates and exit criteria.

Be specific and opinionated. No placeholders, no "TODO", no meta commentary outside the files.`;

export const Route = createFileRoute("/api/blueprint")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { idea, domain, answers, codebaseContext } = (await request.json()) as {
          idea?: string;
          domain?: string;
          answers?: { question: string; answer: string }[];
          codebaseContext?: {
            repoName: string;
            fileTree?: string[];
            keyFiles?: Array<{ path: string; content: string }>;
          };
        };
        if (!idea) return new Response("Missing idea", { status: 400 });

        const answerBlock = (answers ?? [])
          .map((a) => `- ${a.question} => ${a.answer}`)
          .join("\n");

        let contextBlock = "";
        if (codebaseContext?.repoName) {
          const filesSummary = (codebaseContext.keyFiles ?? [])
            .map((f) => `### ${f.path}\n\`\`\`\n${f.content.slice(0, 3000)}\n\`\`\``)
            .join("\n\n");

          const treeSummary = (codebaseContext.fileTree ?? []).slice(0, 80).join("\n");

          contextBlock = `\n\n[CONTEXT FROM EXISTING GITHUB REPO]:\nRepository: ${codebaseContext.repoName}\n\nExisting File Tree (Sample):\n${treeSummary}\n\nExisting Schema & Architecture Files:\n${filesSummary}\n\nTASK:\nAnalyze the existing architecture above, avoid breaking existing table structures, and generate new migrations and complementary endpoints that cleanly extend this existing codebase.`;
        }

        return streamArchitect({
          instructions: INSTRUCTIONS,
          input: `Software idea: ${idea}\nDomain: ${domain ?? "unspecified"}\n\nSurvey answers:\n${answerBlock}${contextBlock}`,
          effort: "medium",
          signal: request.signal,
        });
      },
    },
  },
});
