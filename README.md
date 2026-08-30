# Pocket CTO 🚀

**Turn a one-line idea or existing code into a working, deployed project in minutes.**

Pocket CTO is your autonomous AI development partner in the browser. You can give it a single idea or connect an existing GitHub repository, and it will plan the architecture, write the code, set up the database, and deploy a live preview. If you prefer building in other tools like Cursor, Bolt, v0, Windsurf, or Lovable, Pocket CTO can also generate ready-to-use prompts tailored for those platforms.

---

## ⚡ Built With

- **Google Anti-Gravity AI** — Powers the autonomous multi-agent reasoning, architectural planning, and streaming code execution engine.
- **Lovable.dev** — Platform interface engineering, cloud infrastructure, and hosting.
- **Lovable.dev Database / Supabase** — Managed PostgreSQL cloud database with Row-Level Security (RLS) and real-time schema migrations.

---

## ✨ Key Features

- **From 1-Line Idea to Full App:** Just describe what you want to build. Pocket CTO handles the plan, code, database, and hosting.
- **Works with Existing Repositories:** Connect any GitHub repo. Pocket CTO scans your project structure and dependencies before suggesting or writing changes.
- **Architectural Survey:** Asks simple multiple-choice questions to pick the best tools, libraries, and auth setup for your needs.
- **Implementation Plans:** See a breakdown of what will be built before any code is generated. You can approve it, tweak it, or start over.
- **In-Browser Monaco Code Editor & Live Preview:** Edit files directly in your browser and see real-time UI previews on mobile, tablet, and desktop screens.
- **Instant Frontend Deployment (Vercel):** Programmatically builds and hosts your frontend automatically with a live `.vercel.app` link.
- **Database Ready (Supabase / Lovable Database):** Automatically connects and runs database migrations for each project.
- **2-Way GitHub Sync:** Save changes back to your GitHub repository with clean commit messages or pull requests.
- **Export Prompts for Third-Party Tools:** Generate optimized prompts to build your components inside Lovable, Cursor, Bolt, Windsurf, or v0.

---

## 🛠️ How It Works

```
Idea / Repo Input ➔ 2. Architecture Questions ➔ 3. Plan Review ➔ 4. Code Generation ➔ 5. Supabase & Vercel Live Preview ➔ 6. GitHub Sync
```

1. **Input:** Type a project idea or paste your GitHub repository link.
2. **Survey:** Answer a few quick multiple-choice questions about your preferred tools.
3. **Plan:** Review the generated file list and implementation steps.
4. **Code:** The AI writes full, working code matching your project design.
5. **Deploy & Preview:** The frontend deploys to Vercel and the database connects to Supabase / Lovable DB instantly.
6. **Sync:** Push your code directly to GitHub with one click.

---

## 🧰 Complete Platform Tech Stack

### Core AI & Agent Intelligence
- **Google Anti-Gravity AI & Google Gemini Engine:** Autonomous streaming agents for system architecture, database DDL synthesis, and production code execution.

### Frontend & UI Architecture
- **Framework:** React 19 & TypeScript
- **Routing & State:** TanStack Router, TanStack Start & TanStack Query
- **Styling & Tokens:** Tailwind CSS v4 & Lucide Icons
- **Code Editor:** Monaco Editor (Browser-based VS Code experience)
- **UI Components:** Radix UI primitives & custom high-contrast design system

### Backend & Serverless Runtime
- **Server Framework:** Nitro Engine & TanStack Start Server Functions
- **Runtime:** Node.js

### Database & Authentication
- **Database:** Lovable.dev Managed Cloud Database & Supabase (PostgreSQL with RLS)
- **Authentication:** Google OAuth & GitHub OAuth unified by canonical email

### Cloud Hosting & Deployment
- **Frontend Live Preview Engine:** Vercel REST API (`v13/deployments`)
- **Platform Hosting:** Lovable.dev Cloud Hosting

### Version Control & Git Engine
- **Git Engine:** GitHub REST Git Trees API & Octokit (atomic blobs, trees, and commit references)

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/usmanmadani/pocket-cto.git
cd pocket-cto
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root folder:

```bash
cp .env.example .env
```

Fill in your API keys in the `.env` file.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Environment Setup

See `.env.example` for the required keys:

- `GEMINI_API_KEY` - For Google Anti-Gravity AI & Gemini code/planning engine.
- `VERCEL_AUTH_TOKEN` - For automatic frontend deployments.
- `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` - For database connections.
- `GITHUB_ACCESS_TOKEN` - For pushing commits to GitHub.

---

## 🔗 Project Links

- **Live Demo App:** [https://pocket-cto.lovable.app/](https://pocket-cto.lovable.app/)
- **Source Code Repository:** [https://github.com/usmanmadani/pocket-cto](https://github.com/usmanmadani/pocket-cto)
