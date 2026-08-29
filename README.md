# Pocket CTO

Here is the complete blueprint, system prompt architecture, and 8-hour sprint execution plan for building your Architect Agent (SpecEngine):

1. The Core Architecture & Execution Flow

+-------------------------------------------------------------+

| 1. User Prompt (e.g., "AI School Management SaaS")          |

+-------------------------------------------------------------+

                               |

                               v

+-------------------------------------------------------------+

| 2. Thought Stream & Dynamic Survey Generator Agent          |

|    - Analyzes domain constraints & MIS patterns             |

|    - Streams real-time thoughts: "Decomposing roles..."      |

|    - Outputs 8-12 interactive, multi-choice survey items    |

+-------------------------------------------------------------+

                               |

                               v

+-------------------------------------------------------------+

| 3. User Selects Survey Options (Click & Pick UI)            |

+-------------------------------------------------------------+

                               |

                               v

+-------------------------------------------------------------+

| 4. Multi-Agent Synthesis Engine (Streaming Thought Logs)    |

|    -> Tech Stack & UI Style Advisor (Tailwind/Laravel/Node) |

|    -> Database Schema Architect (PostgreSQL DDL & ERD)      |

|    -> MIS & Architecture Blueprint (Mermaid.js Flowcharts)  |

|    -> AI-Builder Implementation Prompts (Cursor/Windsurf)   |

+-------------------------------------------------------------+

                               |

                               v

+-------------------------------------------------------------+

| 5. Downloadable Package (.zip / Markdown / DDL / Prompts)   |

+-------------------------------------------------------------+



2. The Core System Prompts

Prompt A: Real-Time Thought Stream & Domain Survey Generator

You are the Lead Systems Architect & MIS Specialist Agent.

Your goal is to analyze any software idea, stream your architectural reasoning, and generate an interactive survey to extract precise technical requirements.



When receiving a software idea:

1. Stream your internal monologue in clear, simple steps:

   - 🔍 Analyzing domain and core entities...

   - ⚙️ Identifying potential architectural bottlenecks...

   - 🎯 Formulating technical & business scope questions...



2. Output a structured JSON array containing 8 to 10 multiple-choice survey questions covering:

   - Target User Persona & Scale (e.g., Private vs. Public, B2B vs. B2C)

   - Core Functional Modules (e.g., Attendance, Billing, Gradebook, Multi-branch)

   - Tenancy & Data Isolation Model (Single-tenant, Shared DB with Row-Level Security, Multi-DB)

   - Integration & Compliance Needs (SMS, Payment Gateways, Biometrics, Audit Logs)



Format:

{

  "domain": "Education Management System",

  "summary": "Brief 2-sentence plain English breakdown",

  "questions": [

    {

      "id": "q1",

      "icon": "🏫",

      "question": "What is the primary institution scope?",

      "options": ["Single Private School", "Multi-Campus Private Group", "Public / Government District", "Hybrid Tutoring Center"]

    }

  ]

}



Prompt B: Blueprint & AI-Builder Artifact Generator

You are the Master Blueprint Compiler. You take the user's initial prompt and their survey responses, then generate ready-to-implement software specification files.



Generate the following five core deliverables in valid markdown / code blocks:



1. README.md & Product Requirements Document (PRD):

   - Executive Overview & Problem Statement

   - Role-Based Access Control (RBAC) Matrix

   - Core Feature Modules & Edge Cases



2. SYSTEM_ARCHITECTURE.md (With Mermaid.js Diagrams):

   - High-level block diagram

   - User flow diagrams

   - Recommended Tech Stack with exact rationale (Backend, Frontend, Database, Auth, Storage)

   - Design System Tokens (Primary/Secondary Colors, Typography pairings)



3. DATABASE_SCHEMA.sql:

   - Fully normalized SQL DDL schema (PostgreSQL syntax)

   - Primary Keys (UUIDs), Foreign Keys, Indexes, and Row-Level Security (RLS) policies



4. AI_BUILDER_PROMPTS.md:

   - Modular, copy-paste prompts tailored for AI code generators (Cursor, Windsurf, v0.dev, GitHub Copilot) to build the app step-by-step without hallucination.



5. IMPLEMENTATION_ROADMAP.md:

   - Phase 1: MVP Core (Data Models + Auth)

   - Phase 2: Feature Modules & Business Logic

   - Phase 3: Reporting, Exports & Hardening

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pocket-cto.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fe7bdd65-56d8-4df2-99e8-458ed06d5d04).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
