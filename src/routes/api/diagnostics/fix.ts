import { createFileRoute } from "@tanstack/react-router";
import { streamArchitect } from "@/lib/ai-stream.server";

const INSTRUCTIONS = `You are the Expert Code & Schema Diagnostics Auto-Fix Sub-Agent.
You receive a specific file from a software blueprint along with a detected architectural/security/schema diagnostic issue and suggestion.

Your task:
1. Explain your fix reasoning concisely in thinking tags.
2. Output the COMPLETE revised file content with the issue cleanly corrected and best practices applied.
3. Preserve all existing tables, columns, markdown sections, and structure, only enhancing and fixing the identified defect.
4. Output ONLY the raw file content in the text stream without markdown code fences around the entire response.`;

export const Route = createFileRoute("/api/diagnostics/fix")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { fileName, fileContent, issueTitle, issueDescription, issueSuggestion } =
          (await request.json()) as {
            fileName?: string;
            fileContent?: string;
            issueTitle?: string;
            issueDescription?: string;
            issueSuggestion?: string;
          };

        if (!fileName || !fileContent || !issueTitle) {
          return new Response("Missing required parameters for auto-fix", {
            status: 400,
          });
        }

        const inputPrompt = [
          `File to Patch: ${fileName}`,
          `Detected Issue: ${issueTitle}`,
          `Issue Details: ${issueDescription}`,
          `Recommended Fix: ${issueSuggestion}`,
          "",
          "--- CURRENT FILE CONTENT START ---",
          fileContent,
          "--- CURRENT FILE CONTENT END ---",
          "",
          "Please apply the fix and output the complete revised content of this file.",
        ].join("\n");

        return streamArchitect({
          instructions: INSTRUCTIONS,
          input: inputPrompt,
          effort: "medium",
          signal: request.signal,
        });
      },
    },
  },
});
