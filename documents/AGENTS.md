# AGENTS.md: How to build this project

You are building a college super-app (students, teachers, admins) with a team of three human developers. Read `PLAN.md` for what and why, and `DESIGN.md` for all UI decisions, before writing code. If a task conflicts with those files, stop and ask rather than silently diverging.

## 1. Operating rules
1. **Plan before code.** For any task, first write a short plan: files you will touch, tables you will add or change, risks. Wait for approval on anything that changes the database schema, auth, permissions or the shared folder.
2. **One slice at a time.** A slice is a complete vertical piece: migration, RLS policies, Zod schema, server action or query, UI, tests. Do not build "all the UI first" or "all the tables first".
3. **Small diffs.** Keep each change reviewable in under 15 minutes. If a task grows, split it and say so.
4. **Spec first.** Each feature has `src/features/<name>/README.md` covering purpose, user stories, states, permissions, edge cases. Write or update it before the code.
5. **Don't cross feature boundaries.** A feature imports from `shared/` and `lib/` only, never from another feature. Cross-feature effects go through `notify()`, `calendar_entries` and `events_outbox`.
6. **Security by default.** Every table has RLS and explicit policies. Never use the service role key in client code. Validate all input with Zod on the server. Never trust role claims from the client.
7. **Ask when requirements are ambiguous.** Do not invent business rules (SLA hours, escalation chains, fees). Put them in config tables and use clearly labeled seed values.
8. **Don't add dependencies casually.** Propose any new package with the reason and the alternatives first.
9. **No secrets in the repo.** Use environment variables and `.env.example`.
10. **Leave things working.** Typecheck, lint and tests pass before you say a task is done.

## 2. Stack (do not substitute without approval)
Next.js App Router, TypeScript (strict), Tailwind with tokens from `DESIGN.md`, shadcn/ui, Lucide, Supabase (Postgres, Auth, Realtime, Storage, Edge Functions, pg_cron, pgvector), Zod, Vitest, Playwright, LiveKit, tldraw, Gemini API.

## 3. Conventions
- Server components by default; client components only for interactivity (forms, chat, whiteboard, maps).
- Data reads in `queries.ts`, writes in `actions.ts`; both validate with the schema in `schema.ts`.
- Database changes only through numbered SQL files in `supabase/migrations/`. Never edit an applied migration; add a new one. Regenerate types after each migration.
- Naming: tables snake_case plural; components PascalCase; files kebab-case; names describe the domain ("ComplaintTimeline"), not the technology.
- Every list view has loading, empty and error states; every form has validation messages and a disabled/submitting state.
- Time: store UTC, display in `Asia/Kolkata`.
- UI text follows `DESIGN.md` voice: sentence case, verb buttons, specific errors.
- Accessibility floor from `DESIGN.md` section 11 is part of "done".

## 4. Definition of done (per slice)
- [ ] Spec in the feature README is up to date
- [ ] Migration applied locally, RLS tested with at least one allowed and one denied case
- [ ] Zod schema shared by client and server
- [ ] UI matches `DESIGN.md` tokens (no hardcoded colors, sizes or springs)
- [ ] Works at mobile width and in dark mode
- [ ] Unit tests for business rules (escalation timing, slot conflicts, state transitions); one Playwright test for the main flow
- [ ] Notifications and calendar entries created where the plan says so
- [ ] No console errors, typecheck and lint clean
- [ ] Short summary: what changed, how to test it, anything left undone

## 5. Build order
Follow `PLAN.md` section 8. Right now: **Phase 0 (foundation)**. Do not start Phase 1 features until the shell, auth, roles, notifications and calendar tables exist and a student and a teacher can log in.

### Suggested first prompts, in order
1. "Read PLAN.md, DESIGN.md and AGENTS.md. Summarize your understanding in 10 bullets and list anything unclear. Do not write code."
2. "Create the repo skeleton from PLAN.md section 7: Next.js, Tailwind, shadcn, lint and test setup, folder structure, `.env.example`. Implement `tokens.css` and the Tailwind config from DESIGN.md."
3. "Create the Supabase migrations for `profiles`, `user_roles`, `roster_import`, `notifications`, `calendar_entries`, `audit_log` with RLS, plus seed data for one admin, two teachers, five students."
4. "Implement college email one-time-code sign-in limited to the roster (PLAN.md section 4.1), role resolution from `user_roles`, and route guards for student, teacher and admin. No passwords, no Google or social sign-in."
5. "Build the app shell from DESIGN.md section 6: sidebar, top bar with placeholder ID chip and IN/OUT pill, bell wired to `notifications` via Realtime, bottom tab bar on mobile."
6. Then Phase 1 slices, one per prompt, starting with presence, then identity, complaints, meet, acad, calendar.

## 6. Feature-specific guardrails
- **Presence:** the inside/outside/unknown decision happens server-side. Monitoring needs recorded consent before any heartbeat is stored; honour pause and revoke immediately. Never store raw coordinates and never record where a person is when outside campus. Treat missing heartbeats as `unknown`, not `outside`. Teachers and admins get aggregates only; individual lookups require a reason and an audit log entry. Always show last verified time.
- **Complaints:** domains and routing chains are database data. Escalation runs in a scheduled job and must be idempotent (running twice does not escalate twice). Every transition writes `complaint_events`. Sensitive domains are excluded from the public tracker.
- **Meet:** prevent double-booking with a database constraint, not just UI checks. Test two simultaneous requests.
- **ID:** QR contains a short-lived signed token, never raw identifiers. Revocation takes effect immediately.
- **Lost and found:** implement the full state machine in section 5.5 of the plan; hidden verification detail must never be returned to the client by general queries.
- **AI features:** answers must be grounded in retrieved chunks with citations; say "not found in the resources" when retrieval is weak; enforce per-user daily limits.
- **Payments (clubs):** membership activates only after a verified server-side webhook, never from a client redirect.

- **Auth:** sign-in is a one-time code sent to a college email that exists in `roster_import`. Never reveal whether an email is registered (same message either way), rate-limit code requests and verification by IP and by email, log attempts, make codes single-use with a short expiry and limited tries, and never store codes in plain text. Never create an account for an email that is not on the roster. Organizer accounts live behind a separate sign-in, require admin approval, reject roster emails, and have row level security access to event tables only.

## 7. Working with the human team
- Three developers own areas (see PLAN.md section 9). Stay inside the area of the person you are working with unless told otherwise.
- Never force-push or rewrite shared branches. One feature per branch, descriptive commit messages.
- If you find a bug or security problem outside your task, report it instead of quietly fixing it.
- When you finish, give a summary and list follow-ups; do not start the next slice on your own.

## 8. When uncertain
Stop and ask. Offer two options with trade-offs and a recommendation. Cheap questions early beat expensive rewrites later.
