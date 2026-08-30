import { createFileRoute } from "@tanstack/react-router";
import { streamArchitect } from "@/lib/ai-stream.server";

const CHAT_AGENT_INSTRUCTIONS = `You are Pocket CTO — an Autonomous Principal AI Software Engineer, Lead Full-Stack Architect, and Interactive Pair Programmer.

You have DIRECT, AUTONOMOUS READ/WRITE ACCESS to the entire codebase in the user's workspace.

YOUR CAPABILITIES & RULES:
1. CODEBASE MODIFICATION & CREATION:
   - When the user asks you to build, change, modify, add, or refactor anything (e.g. "change the footer", "add a user profile page", "add stripe checkout", "fix the button colors", "add supabase RLS"):
     - Inspect the provided codebase files.
     - Modify existing files or create brand new files.
     - ALWAYS output the complete, production-ready code for every modified or new file using this exact delimiter:
       ===FILE: <filepath>===
       <complete file source code>
     - Do NOT use placeholder comments like "// TODO" or "// rest of code remains the same". Write full, working code.

2. CONVERSATION CONTEXT & DECISION MEMORY:
   - You remember the entire previous conversation thread. Ground your logic in prior decisions, data models, and styling patterns.

3. ARCHITECTURAL DECISIONS & INTERACTIVE OPTIONS:
   - If there are different ways to implement a feature, propose 2 or 3 distinct options to the user formatted as:
     [OPTION: Option Name | Brief description of this approach]
     The UI will render these as clickable 1-click decision buttons for the user.

4. EXPLANATION & SUMMARY:
   - Explain what you built or changed clearly and concisely.
   - List the tasks you accomplished and highlight any new database tables or endpoints created.`;

export const Route = createFileRoute("/api/agent/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const {
          message,
          chatHistory,
          files,
          ideaTitle,
          domain,
          codebaseContext,
          userFlow,
        } = (await request.json()) as {
          message: string;
          chatHistory?: Array<{ role: "user" | "assistant"; text: string }>;
          files?: Array<{ name: string; content: string }>;
          ideaTitle?: string;
          domain?: string;
          codebaseContext?: { repoName: string; fileTree?: string[] };
          userFlow?: unknown;
        };

        if (!message) {
          return new Response("Missing message", { status: 400 });
        }

        // Format conversation history
        const formattedHistory = (chatHistory ?? [])
          .slice(-10) // Last 10 messages for rich context
          .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
          .join("\n\n");

        // Format all current workspace files
        const formattedFiles = (files ?? [])
          .map((f) => `--- FILE: ${f.name} ---\n${f.content.slice(0, 15000)}\n--- END FILE ---`)
          .join("\n\n");

        const input = [
          `Project Title: ${ideaTitle || "Software Application"}`,
          `Domain: ${domain || "SaaS Platform"}`,
          codebaseContext?.repoName ? `Connected GitHub Repo: ${codebaseContext.repoName}` : "",
          "",
          "=== PREVIOUS CONVERSATION THREAD ===",
          formattedHistory || "No previous messages.",
          "",
          "=== CURRENT WORKSPACE CODEBASE FILES ===",
          formattedFiles || "No files in workspace.",
          "",
          "=== NEW USER INSTRUCTION ===",
          `USER: ${message}`,
          "",
          "Analyze the codebase above, fulfill the user's request, and output any modified/new files with ===FILE: path/to/file=== delimiters.",
        ]
          .filter(Boolean)
          .join("\n\n");

        return streamArchitect({
          instructions: CHAT_AGENT_INSTRUCTIONS,
          input,
          effort: "high",
          signal: request.signal,
        });
      },
    },
  },
});
