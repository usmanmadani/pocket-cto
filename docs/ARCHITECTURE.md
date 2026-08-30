# Pocket CTO Architecture

This document details how Pocket CTO orchestrates autonomous code generation, multi-tenant database provisioning, programmatic live hosting deployments, and bi-directional GitHub synchronization.

---

## ⚡ Platform Architecture & Infrastructure

Pocket CTO is built with a unified modern stack:
- **Core AI Engine:** Google Anti-Gravity AI & Google Gemini API powering autonomous multi-agent reasoning, interactive surveys, implementation planning, and AST code execution.
- **Application Framework & Hosting:** Lovable.dev & React 19 / TanStack Start.
- **Cloud Database:** Lovable.dev Database / Supabase PostgreSQL with automated DDL migrations and Row-Level Security (RLS).
- **Live Preview Hosting:** Vercel REST Deployments API (`v13/deployments`).
- **Version Control Engine:** GitHub REST Git Trees API (Octokit).

---

## 1. Project Workflow

```
[ User Input ]
      │
      ▼
[ Context / Repo Discovery ]
      │
      ▼
[ Interactive Survey ] (User choices + Custom inputs)
      │
      ▼
[ Implementation Plan Artifact ] (Approve / Edit / Reject)
      │
      ▼
[ Autonomous Code Generator (Google Anti-Gravity AI) ] ───► [ Export Prompts (Lovable / Cursor / Bolt / v0) ]
      │
      ├───► [ Lovable / Supabase DB Migration Engine ]
      ├───► [ Vercel Programmatic Deployer ]
      └───► [ GitHub Sync Engine (Octokit) ]
```

---

## 2. Multi-Tenant Database Handling

To keep user data clean, safe, and isolated:
- Each project runs on its own database connection using individual Supabase/Lovable credentials or isolated container schemas.
- When an app is generated, Pocket CTO applies the necessary SQL tables, foreign keys, and RLS policies automatically before the frontend connects.

---

## 3. Programmatic Vercel Deployments

Pocket CTO bypasses the need for local builds:
- Generated in-memory files (`src/App.tsx`, `package.json`, styles, components) are packaged and sent directly to the Vercel Deployments API (`POST /v13/deployments`).
- Database environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are passed alongside the payload.
- Vercel builds the project in the cloud and sends back a unique preview URL (`https://*.vercel.app`) to display in the live workspace iframe.

---

## 4. Third-Party Prompt Exporter

For users who want to build parts of their project in external tools:
- The system packages the project context, file structure, and implementation requirements into clean, structured prompts formatted specifically for platforms like Lovable, Cursor, Bolt, Windsurf, or v0.

---

## 5. GitHub Synchronization

- Pocket CTO uses the GitHub REST API (Octokit) to commit changes.
- It pulls the current commit SHA, creates tree blobs for modified files, creates a commit with Conventional Commit messaging, and updates the target branch head.
