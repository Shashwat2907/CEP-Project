# Campus Super-App

A college super-app for students, teachers and admins. Built with Next.js, TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

> **Status:** Phase 0 — Foundation (in progress)

---

## Team

| Person | Area |
|---|---|
| **Shashwat** | Platform, identity, campus life (shell, auth, presence, ID, calendar, notifications, lost & found, events, friends) |
| **Kushal** | Campus operations (complaints, meet, online call, whiteboard) |
| **Kedar** | Academic and social (resources, flashcards, doubt chat, communities, clubs) |

---

## Docs (read these before writing code)

| File | Decides |
|---|---|
| [`documents/CONTRACT.md`](documents/CONTRACT.md) | How we work: branches, reviews, ownership, agent rules |
| [`documents/PLAN.md`](documents/PLAN.md) | What we build: architecture, data model, phases |
| [`documents/AGENTS.md`](documents/AGENTS.md) | How the AI agent must behave while coding |
| [`documents/TEAM_TASKS.md`](documents/TEAM_TASKS.md) | Branch checklists per person |

---

## Local setup

### Prerequisites
- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/Shashwat2907/CEP-Project.git
cd CEP-Project

# 2. Install dependencies
npm install

# 3. Copy env file and fill in your values
cp .env.example .env.local

# 4. Start local Supabase
supabase start

# 5. Apply migrations
supabase db reset

# 6. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Branch workflow

```
main  ← protected, production
  └── develop  ← protected, integration (all PRs target here)
        └── feat/<area>-<slice>  ← your work
```

- Branch from `develop`: `git checkout develop && git pull && git checkout -b feat/<area>-<slice>`
- Open PRs into **`develop`** only
- One reviewer + passing CI required to merge
- Squash and merge; delete branch after

---

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright e2e tests |
| `npm run format` | Prettier |

---

## Tech stack

Next.js · TypeScript · Tailwind CSS · shadcn/ui · Lucide · Supabase (Postgres, Auth, Realtime, Storage, Edge Functions, pg_cron, pgvector) · Zod · Vitest · Playwright · LiveKit · tldraw · Gemini API
