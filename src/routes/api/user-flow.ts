import { createFileRoute } from "@tanstack/react-router";
import { streamArchitect } from "@/lib/ai-stream.server";

const INSTRUCTIONS = `You are the UI/UX Flow Architect Agent.
Analyze the user's product idea, domain, survey answers, and technical blueprint, then output a structured JSON representing the complete end-to-end user navigation flow:

1. Entry points (Start -> Splash Screen -> Auth Decision: Sign In / Sign Up)
2. Home / Main Dashboard Hub
3. 3-6 core domain feature branches tailored to the specific application
4. Sub-screens and concrete user action items for each branch with Lucide icon names, clean descriptions, and conversion highlights.

Respond ONLY with valid JSON matching this schema:
{
  "title": "Navigation & User Journey Map",
  "subtitle": "End-to-end user navigation flow",
  "entry": {
    "start": "START",
    "splash": { "title": "Splash & Onboarding", "subtitle": "Welcome & value proposition", "icon": "Smartphone" },
    "decision": { "title": "Authentication", "subtitle": "New or returning user?" },
    "auth_routes": [
      { "type": "Sign Up", "title": "Create Account", "subtitle": "Email & Social OAuth", "icon": "UserPlus", "color": "purple" },
      { "type": "Sign In", "title": "Login to Portal", "subtitle": "Session restoration", "icon": "LogIn", "color": "blue" }
    ]
  },
  "hub": { "title": "Main Dashboard", "subtitle": "Central operational hub", "icon": "LayoutDashboard" },
  "branches": [
    {
      "name": "Feature Branch Name",
      "color": "cyan",
      "icon": "Folder",
      "steps": [
        { "title": "Step Name", "subtitle": "Action description", "icon": "CheckCircle2", "highlight": true }
      ]
    }
  ]
}`;

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
          format: { type: "json" },
          effort: "medium",
          signal: request.signal,
        });
      },
    },
  },
});
