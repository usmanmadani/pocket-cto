import { createFileRoute } from "@tanstack/react-router";
import { streamArchitect } from "@/lib/ai-stream.server";

const MASTER_TEST_INSTRUCTIONS = `You are Pocket CTO AI — Principal Quality Assurance Engineer and Test Automation Architect.

Your task is to synthesize a complete, runnable Unit & E2E Test Suite for the project:

1. UNIT & INTEGRATION TESTS (Vitest):
   - Database Schema & RLS Tests (\`tests/db/schema.test.ts\`): Test primary keys, foreign key constraints, cascade rules, and RLS policies.
   - Authentication & Auth Guard Tests (\`tests/unit/auth.test.ts\`): Test login, session creation, token validation, and RBAC permissions.
   - Core Business Logic & API Tests (\`tests/unit/api.test.ts\`): Test CRUD handlers, validation schemas, and error boundaries.

2. END-TO-END TESTS (Playwright):
   - User Navigation & Critical Path E2E (\`tests/e2e/user-flow.spec.ts\`): Test screen transitions based on the User Flow diagram (Splash -> Auth -> Dashboard -> Feature Branches).

STRICT RULES:
- Output full, un-truncated test code with proper Vitest (\`describe\`, \`it\`, \`expect\`, \`beforeEach\`) and Playwright (\`test\`, \`expect\`) syntax.
- Demarcate every file with explicit delimiters:
===FILE: tests/unit/auth.test.ts===
<test code>
===FILE: tests/db/schema.test.ts===
<test code>
===FILE: tests/e2e/user-flow.spec.ts===
<test code>
===FILE: vitest.config.ts===
<vitest config>
===FILE: playwright.config.ts===
<playwright config>`;

export const Route = createFileRoute("/api/agent/tests")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { files, userFlow, ideaTitle, domain } = (await request.json()) as {
          files?: { name: string; content: string }[];
          userFlow?: {
            title?: string;
            branches?: Array<{
              name: string;
              steps: Array<{ title: string; subtitle: string }>;
            }>;
          };
          ideaTitle?: string;
          domain?: string;
        };

        const sqlFile = files?.find(
          (f) =>
            f.name.toLowerCase().endsWith(".sql") ||
            f.name.toLowerCase().includes("schema"),
        );
        const prdFile = files?.find(
          (f) =>
            f.name.toLowerCase().includes("prd") ||
            f.name.toLowerCase().includes("readme"),
        );

        const input = [
          `Application: ${ideaTitle || "SaaS Platform"} (${domain || "Web Application"})`,
          "",
          ...(sqlFile
            ? [
                "--- DATABASE SCHEMA SPECIFICATION ---",
                sqlFile.content.slice(0, 15000),
                "",
              ]
            : []),
          ...(prdFile
            ? [
                "--- PRD / REQUIREMENTS ---",
                prdFile.content.slice(0, 10000),
                "",
              ]
            : []),
          ...(userFlow?.branches
            ? [
                "--- USER FLOW NAVIGATION SPECIFICATION ---",
                ...userFlow.branches.map(
                  (b) =>
                    `Branch [${b.name}]: ${b.steps?.map((s) => s.title).join(" -> ")}`,
                ),
                "",
              ]
            : []),
          "Synthesize a robust, production-grade Vitest and Playwright test suite covering unit tests, schema validation, auth security, and E2E browser flows.",
        ].join("\n");

        return streamArchitect({
          instructions: MASTER_TEST_INSTRUCTIONS,
          input,
          effort: "high",
          signal: request.signal,
        });
      },
    },
  },
});
