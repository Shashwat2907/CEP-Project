# CONTRACT.md: How We Build and Merge This Project

This is our working agreement. It covers everything from first setup to the final release: who owns what, how branches move, how everything is merged into one app, what the agents may and may not do, and how we resolve disagreements. Humans and agents both follow it. If something is not covered here, ask in the team chat and add the answer to this file through a pull request.

## 0. Document hierarchy
Five files live in the repo root. When they seem to disagree, use this order for the topic named:

| File | Decides | Wins on |
|---|---|---|
| `CONTRACT.md` (this file) | Process: branches, merging, ownership, reviews, agent conduct | How we work |
| `AGENTS.md` | How the AI agent behaves while coding | Agent behaviour |
| `PLAN.md` | What we build, architecture, data model, phases | Features and technical design |
| `DESIGN.md` | All UI: color, type, layout, motion, copy | Anything visual |
| `TEAM_TASKS.md` | Branch list and checklists per person | What to work on next |

A change to any of these files goes through a pull request labelled `docs-change` and needs approval from all three of us.

---

## 1. Ownership

### 1.1 People and areas
| Owner | Area | Folders owned | Tables owned |
|---|---|---|---|
| **You** | Platform, identity, campus life | `src/app/layout*`, `src/app/(auth)`, `src/shared/ui`, `src/shared/auth`, `src/features/{presence,identity,profile,calendar,notifications,lostfound,events,friends}`, `src/styles`, `src/lib/motion.ts` | `profiles`, `user_roles`, `roster_import`, `login_attempts`, `external_organizers`, `presence_*`, `campus_zones`, `notifications`, `calendar_entries`, `audit_log`, `events_outbox`, `lost_found_*`, `events`, `event_rsvps`, `friendships` |
| **Kushal** | Campus operations | `src/features/{complaints,meet}` and their routes | `complaint_*`, `domain_assignees`, `availability_*`, `session_requests` |
| **Kedar** | Academic and social | `src/features/{acad,community,clubs}` and their routes, `src/shared/chat` | `subjects`, `resources`, `resource_chunks`, `flashcard*`, `ai_usage`, `communities`, `community_*`, `messages`, `message_votes`, `clubs`, `club_*` |

### 1.2 What ownership means
- The owner decides how their area works, writes its migrations, and answers questions about it.
- Nobody edits files in another person's area. If you need a change, send a **request** (section 9.3) and carry on with other work.
- The owner of an area is the default reviewer for any pull request touching it.
- If an owner is unavailable and something blocks the team, another person may make the minimal change, tagging the owner in the pull request for after-the-fact review.

### 1.3 Shared files (everyone may need to touch; extra care)
`package.json` and lockfile, `.env.example`, `README.md`, `docs/contracts/*`, CI config, `supabase/seed.sql`. Rules: keep changes minimal, merge quickly, and rebase right after someone else merges a change to these.

---

## 2. Environments and secrets

| Environment | Branch | Supabase project | Purpose |
|---|---|---|---|
| Local | any | local Supabase (CLI) or your own dev project | day-to-day work |
| Preview | `develop` and each pull request | shared **dev** Supabase project | team integration and testing |
| Production | `main` | separate **prod** Supabase project | real users |

- Production data and keys are never used locally or in previews.
- Secrets live only in Vercel and Supabase settings and in a shared password manager. Never in the repo, chat, screenshots, or an agent prompt. `.env.example` lists variable names with empty values.
- The Supabase service role key is server-only. If it ever leaks, rotate it immediately and tell the team.
- Migrations are applied to the dev project when merged into `develop`, and to prod only when `develop` is released to `main` (section 7).

---

## 3. Git workflow

### 3.1 Branches
- `main`: production. Protected. Only receives merges from `develop` through a release pull request.
- `develop`: integration. Protected. Always deployable. Receives feature pull requests.
- `feat/<area>-<slice>`: new features, branched from `develop`. Example: `feat/complaints-escalation`.
- `fix/<area>-<what>`: bug fixes, branched from `develop`.
- `chore/<what>`: setup, dependencies, tooling.
- `docs/<what>`: documentation and specs.
- `hotfix/<what>`: urgent production fix, branched from `main` (section 8).

Names are lowercase, hyphenated, and match the branch list in `TEAM_TASKS.md`. One branch is one slice: migration, policies, schema, logic, UI, tests.

### 3.2 Commits
- Format: `type(area): short summary`, for example `feat(complaints): escalate overdue complaints`. Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`.
- Commit often on your own branch; commits there can be messy because pull requests are squashed.
- Never commit secrets, `.env` files, large binaries, or generated build output.

### 3.3 Starting work on a branch
```
git checkout develop
git pull origin develop
git checkout -b feat/<area>-<slice>
```
Before an agent session starts: confirm the branch, confirm the spec for the slice exists in `features/<area>/README.md`, and pull the latest `develop`.

### 3.4 Staying current
At the start of every working session and before opening a pull request:
```
git fetch origin
git rebase origin/develop
```
Resolve conflicts on your branch, never on `develop`. If a rebase is messy, stop and ask the owner of the conflicting files.

### 3.5 Pull requests
- Target branch: `develop`. Never open a feature pull request into `main`.
- Keep it small: one slice, reviewable in about fifteen minutes. If larger, split.
- Title follows commit format. Use the template in section 3.6.
- Needs: passing CI, one approving review (owner of any touched area, or a teammate for your own area), and all review comments resolved.
- Merge method: **squash and merge** into `develop`. Delete the branch afterwards.
- The author merges their own approved pull request. Nobody merges a pull request that is red.

### 3.6 Pull request template (copy into `.github/pull_request_template.md`)
```
## What and why
## How to test (steps a reviewer can follow)
## Screens (desktop, mobile, dark mode) if UI changed
## Database changes (migration file, RLS policies, rollback note)
## Contracts touched (notification types, calendar sources, outbox events, shared components)
## Checklist
- [ ] Spec in features/<area>/README.md is up to date
- [ ] Migration applied locally; RLS tested with an allowed and a denied case
- [ ] Types regenerated
- [ ] Matches DESIGN.md (no hardcoded colors, sizes or springs)
- [ ] Works on mobile width and dark mode; empty, loading and error states done
- [ ] Tests added; typecheck, lint and tests pass
- [ ] No secrets, no console errors
- [ ] Other owners tagged if their area is affected
```

### 3.7 Review rules
- Reviewers check behaviour and risk first (permissions, data access, migrations), style second.
- The reviewer actually runs the preview deployment of the pull request for anything with UI or database changes.
- Review turnaround: reviewing a teammate's pull request is the first thing you do when you finish a task, before starting your next one.
- AI-generated code is reviewed like any other code. "The agent wrote it" is not a reason to skip reading it.

---

## 4. Working with the agent in Antigravity

The three shared documents (`PLAN.md`, `DESIGN.md`, `AGENTS.md`) are loaded for every session. This section is the human side of that arrangement.

### 4.1 Session rules
1. One agent session works on one branch and one slice. Open a new session for a new slice.
2. Start every session with the starter prompt:
```
Read CONTRACT.md, PLAN.md, DESIGN.md and AGENTS.md. We are on branch <branch-name>.
Spec: features/<area>/README.md. First write a plan listing files, tables, contracts touched and risks.
Wait for my approval before changing the database schema, shared files or any contract.
Then implement only this slice, add tests, and finish with a summary of what changed and how to test it.
```
3. The human reads and approves the plan before any code is written.
4. Two agent sessions never work on the same files at the same time. Check in team chat before starting a slice that touches shared files.
5. Agents commit only on their own feature branch. They never push to `develop` or `main`, never force-push, and never merge.
6. Agents never touch files outside the owner's area unless the owner has approved it in the plan.
7. Agents never run migrations against the production project, and never see production keys.
8. New dependencies need human approval with the reason and alternatives named.
9. When an agent proposes a new business rule (SLA hours, fees, thresholds, escalation chains), it must put it in a config table with clearly labelled seed values and flag it for the team to confirm.
10. If an agent session goes in circles or makes a mess, discard the branch changes and restart with a smaller slice rather than patching on top.

### 4.2 After the agent finishes
- Read the diff yourself. Run the app. Run the tests.
- Check the diff for: files outside your area, new dependencies, edited old migrations, hardcoded colors or secrets, unexpected deletions, disabled lint rules or skipped tests.
- Paste the agent's summary into the pull request description.
- If the agent got something wrong because the docs were unclear, fix the docs in a `docs/` pull request so the next session does not repeat the mistake.

### 4.3 Keep context healthy
- Each feature has `features/<area>/README.md` as the spec; keep it current so any new session can pick up cold.
- Record decisions that matter in `docs/adr/NNN-title.md` (a few lines: context, decision, consequences).
- Never rely on "the agent remembers": anything important goes in a file.

---

## 5. Contracts between areas

Features are connected only through the contracts below. This is what lets three people build in parallel and still end up with one app.

### 5.1 The rule
No feature imports code from another feature's folder. A feature may import from `src/shared`, `src/lib` and its own folder only. Cross-feature effects happen through the shared helpers and registries below.

### 5.2 Shared helpers (owned by You, in `src/shared`)
| Helper | Signature (agreed shape) | Used for |
|---|---|---|
| `notify` | `notify({ userId, type, title, body, link, payload })` | Any in-app notification |
| `addCalendarEntry` | `addCalendarEntry({ userId, sourceType, sourceId, title, startsAt, endsAt, link })` | Anything that should appear in the calendar |
| `removeCalendarEntry` | `removeCalendarEntry({ sourceType, sourceId, userId? })` | Cancellations |
| `writeAudit` | `writeAudit({ actorId, action, entity, entityId, meta })` | Sensitive actions |
| `requireRole` and `getSessionUser` | server-side guards | Every server action and route |
| `emitEvent` | `emitEvent({ type, payload })` writes to `events_outbox` | Decoupled follow-up work |

### 5.3 Shared UI and chat (owners in brackets)
- UI kit in `src/shared/ui` (You). Features compose it; they do not restyle it.
- Chat component in `src/shared/chat` (Kedar). Used by communities, clubs, events and anywhere else needing chat.
- A feature that needs a new shared component sends a request to the owner or proposes it in a pull request approved by the owner.

### 5.4 Registries (in `docs/contracts/`)
Three small files list every allowed value. Adding a value is allowed in your own feature's pull request if you add it to the registry in the same pull request; changing or removing a value is a contract change (5.6).

| Registry file | Contains |
|---|---|
| `notification-types.md` | `type` string, who sends it, payload fields, link target. Example: `complaint.escalated` |
| `calendar-sources.md` | `sourceType` values, color token, link pattern. Example: `meet`, `event`, `club_event`, `class`, `personal` |
| `outbox-events.md` | event `type`, payload, which consumer handles it. Example: `session.accepted` |

Naming: `<feature>.<past-tense-verb>` in lowercase, for example `meet.accepted`, `lostfound.matched`.

### 5.5 Conventions every area follows
- Server actions return `{ ok: true, data }` or `{ ok: false, error: { code, message } }`. `message` is user-readable and follows the voice in `DESIGN.md`.
- Every input is validated with a Zod schema in the feature's `schema.ts` on the server.
- Every list screen has loading, empty and error states; every form has validation and a submitting state.
- Times are stored in UTC and shown in `Asia/Kolkata`.
- Every table has `id`, `created_at`, RLS enabled and explicit policies.
- Links between features use route strings stored in the registries, not imports.

### 5.6 Changing a contract
A contract change is anything that alters or removes a shared helper signature, registry value, shared component props, a shared table column, or a convention in 5.5.
1. Open a pull request labelled `contract-change` that updates the code, every caller, and the registry or documentation together.
2. Post it in team chat before you start. All three must approve.
3. Merge it on its own, never bundled with feature work, and merge it as soon as approved so others can rebase.

---

## 6. Database rules

- All schema changes are SQL files in `supabase/migrations/`, named `<timestamp>_<owner>_<what>.sql`, for example `20261105_kushal_complaints_core.sql`.
- Only the owner of a table writes migrations for it. Need a new column on someone else's table? Send a request.
- Never edit a migration that has been merged. Add a new one.
- Every migration includes RLS policies for new tables and a short comment on how to reverse it.
- Destructive changes (dropping columns or tables, changing types, deleting data) need a note in the pull request and approval from all three.
- After a schema change, regenerate types and commit them in the same pull request.
- Seed data lives in `supabase/seed.sql` and must be safe to run repeatedly. Seed values for business rules are labelled `-- SEED VALUE: confirm with <person or office>`.
- **Migration conflicts:** if two branches add migrations around the same time, the later branch to merge rebases, renames its file with a newer timestamp, and re-runs everything locally from scratch (`supabase db reset`) before merging.
- RLS must be tested: each new table has at least one test showing an allowed user succeeds and a denied user fails.

---

## 7. How everything merges into one app

### 7.1 The flow
```
feat/* branches ──(PR, squash)──► develop ──(release PR, merge commit)──► main
                                    │                                       │
                         dev Supabase + preview                   prod Supabase + production
```

### 7.2 Merge order across the whole project
Branches merge into `develop` in dependency order. A branch never merges before the branches it depends on. Within one row, branches are independent and can merge in any order.

| Layer | Branches | Depends on |
|---|---|---|
| 0 | `chore/project-setup` | nothing |
| 1 | `feat/design-tokens`, `feat/auth-and-roles` | layer 0 |
| 2 | `feat/app-shell`, `feat/notifications-and-calendar-core` | layer 1 |
| 3 (parallel) | `feat/profile-and-roster-import`, `feat/presence-toggle`, `feat/complaints-core`, `feat/meet-availability`, `feat/acad-resources-core`, `feat/community-core` | layer 2 |
| 4 | `feat/digital-id` (after profile), `feat/presence-monitoring` (after presence-toggle), `feat/complaints-escalation` (after complaints-core), `feat/meet-booking` (after availability), `feat/acad-browse-and-filter` and `feat/acad-processing-pipeline` (after acad core), `feat/community-chat` (after community core), `feat/clubs-core` (after community core) | layer 3 |
| 5 | `feat/complaints-tracker-and-upvotes`, `feat/meet-online-call`, `feat/flashcards`, `feat/community-tags`, `feat/clubs-join-and-payments`, `feat/calendar`, `feat/lost-and-found` (after digital-id) | layer 4 |
| 6 | `feat/meet-whiteboard`, `feat/doubt-chat`, `feat/events` (uses chat), `feat/friends` | layer 5 |
| 7 | `feat/organizer-access` | events, auth-and-roles |
| 8 | `chore/pwa-and-performance` | everything above |

Nobody waits idle: if your next branch depends on someone else's unmerged branch, write the spec, tests or UI for the part you control, or take another independent branch from your list.

### 7.3 Stacked work (when you must build on an unmerged branch)
- Prefer waiting and working on something independent.
- If unavoidable, branch from the dependency branch, open your pull request with the dependency's pull request as base, and rebase onto `develop` as soon as the dependency merges.

### 7.4 Rules for `develop`
- `develop` must always build, pass CI, and run. This is the most important rule in this file.
- **If `develop` breaks, stop feature work.** The author of the last merged pull request fixes it first (or reverts it). Nobody merges anything else until it is green again.
- After each merge to `develop`, everyone whose branch is open rebases at their next opportunity.
- Do not leave a feature half-finished in `develop`. If something must merge incomplete, hide it behind a flag in `src/lib/flags.ts` that defaults to off.

### 7.5 Smoke test (run by the merging author after each merge to `develop`, on the preview)
- [ ] Student and teacher can log in; admin can log in
- [ ] Shell loads; nav matches role; bell works
- [ ] Your own feature's main flow works end to end
- [ ] One flow from another area still works (pick any)

### 7.6 Integration checkpoints (all three together, when a layer completes)
At the end of layers 2, 5 and 8 we sit together on the preview deployment and walk the whole app:
- [ ] Every feature in `develop` works for student, teacher and admin
- [ ] Notifications from each feature reach the bell and link to the right page
- [ ] Calendar shows entries from every source with the right colors and links
- [ ] Permissions: a student cannot see or do anything a student shouldn't (try deliberately)
- [ ] No leftover debug code, console errors, or placeholder text
- [ ] Docs, registries and specs match what was built

### 7.7 Releasing to `main`
1. Agree in team chat that `develop` is ready. No feature merges during the release.
2. Open a release pull request from `develop` to `main`, titled `release: <version or milestone>`.
3. Release checklist:
   - [ ] Integration checkpoint done and green
   - [ ] Migrations reviewed in order; each is safe on production data; backup of the prod database taken
   - [ ] Environment variables present in production
   - [ ] Seed or roster data prepared for production (never fake data in prod)
   - [ ] Privacy page and terms visible; anonymous complaint rules verified
4. Merge using a **merge commit** (not squash) so history stays clear. Apply migrations to the prod project. Verify the production deploy with the smoke test.
5. Tag the release: `git tag v0.1.0 && git push --tags`. Version meaning: `0.x` before public launch, `1.0.0` at launch.
6. Announce in team chat what shipped and any known issues.

### 7.8 Phase gates (we do not start a later phase until the gate passes)
| Gate | Condition |
|---|---|
| End of foundation | Student, teacher and admin log in on preview; shell, notifications and calendar helpers merged; CI green |
| End of MVP | Escalation tested with shortened SLAs through every level; two simultaneous bookings of one slot give exactly one success; ID verifier works on a phone and rejects expired, tampered and revoked tokens; students default to their own year and branch in resources; a pilot group has used it and feedback is collected |
| End of collaboration | Call and whiteboard work between two devices; community chat and tags work under several simultaneous users; club membership activates only after verified payment; lost and found full lifecycle passes |
| Before public launch | Accessibility pass, load test with simulated concurrent users, privacy review, backups verified, admin onboarding done |

---

## 8. Hotfix and rollback
- **Bug in `develop`:** open `fix/...` from `develop`, fix, review, merge.
- **Bug in production:** branch `hotfix/<what>` from `main`, fix, review (one reviewer is enough, fast), merge into `main`, tag a patch version, then **also merge `main` back into `develop`** so the fix is not lost.
- **Bad deploy:** revert the merge commit on `main` (or use Vercel's instant rollback), then investigate.
- **Bad migration:** write a new migration that reverses it (we never edit applied ones). For data-loss risks, restore from the pre-release backup and tell the team immediately.
- After any production incident, add a short note in `docs/adr/` or `docs/incidents/` describing what happened and what we changed.

---

## 9. Communication

### 9.1 Daily rhythm
- Start of session: pull `develop`, rebase your branch, check the team chat for contract changes.
- End of session: push your branch (even if unfinished) and post one line: what you finished, what you start next, anything blocking you.
- Review requests: post the pull request link in chat and tag the reviewer.

### 9.2 Decisions
- Small decisions inside your own area: you decide and note it in your feature README.
- Decisions affecting more than one area, or any contract: discuss in chat, decide by majority of the three of us, and record in `docs/adr/`.
- If we are stuck two against one, the two proceed and the one may revisit after a first version is built, with evidence.

### 9.3 Requests across areas
Use this format in team chat:
```
Request for <owner>: <what you need>
Needed in: <table, function, or component name>
Blocks: <your branch>
Workaround meanwhile: <what you will do instead>
```
The owner answers with yes, no or "different way", and the date or branch it will land in. Until it lands, work on something else or mock the call behind the agreed helper signature.

### 9.4 Weekly sync
Once a week, 30 minutes: demo what merged, walk the next layer of the merge order, review open requests and contract changes, update `TEAM_TASKS.md` checklists.

---

## 10. Security and privacy rules (non-negotiable)
- Every table has RLS with explicit policies; the client never decides who is allowed to do something.
- The service role key is used only in server code or Edge Functions.
- Personal data is collected only when a feature needs it. Location monitoring is opt-in with recorded consent, can be paused or revoked at any time, and stores state, zone and confidence only: never raw coordinates, and nothing about where a person is when outside campus. Teachers and admins see aggregates; individual lookups need a reason and are audit-logged. Anonymous complaints hide the author from handlers, but the system keeps the author for abuse control, and this is stated plainly in the UI.
- The hidden verification detail in lost and found is never returned by general queries.
- ID tokens are short-lived and signed; revocation takes effect immediately.
- AI answers must be grounded in retrieved resources with citations; per-user daily limits apply.
- Payments activate memberships only after a verified server-side webhook.
- Uploaded files are validated for type and size and served through signed URLs.
- Rate limits on posting, messaging and AI calls.
- Sign-in is a one-time code sent to a college email that is on the roster. Emails are never treated as proof of existence in error messages (same response either way), codes are single-use with a short expiry, and requests and failed attempts are rate-limited and logged.
- External organizers sign in through a separate page with an email code, need admin approval, cannot use roster emails, and can only reach event features. Their events are labelled as external and go through approval.
- We never put real student data into an agent prompt, a screenshot, or a public issue. Use seed data.

---

## 11. Quality bar
A branch is done only when all of these hold:
- The spec in `features/<area>/README.md` matches what was built
- Migration, policies, Zod schema, logic and UI all exist for the slice
- RLS tested for allowed and denied access
- Unit tests for business rules (escalation, slot conflicts, state transitions, token expiry); one end-to-end test for the main flow
- UI follows `DESIGN.md`, works on mobile and in dark mode, keyboard accessible, has loading, empty and error states
- Typecheck, lint and tests pass in CI
- Contracts and registries updated
- Pull request description complete and reviewed

---

## 12. Branch registry
Mark each branch as the team progresses. Status values: `not started`, `in progress`, `in review`, `merged`.

| Branch | Owner | Depends on | Status |
|---|---|---|---|
| `chore/project-setup` | You | none | not started |
| `feat/design-tokens` | You | project-setup | not started |
| `feat/auth-and-roles` | You | project-setup | not started |
| `feat/app-shell` | You | design-tokens, auth-and-roles | not started |
| `feat/notifications-and-calendar-core` | You | auth-and-roles | not started |
| `feat/presence-toggle` | You | app-shell | not started |
| `feat/presence-monitoring` | You | presence-toggle, notifications-and-calendar-core | not started |
| `feat/profile-and-roster-import` | You | auth-and-roles | not started |
| `feat/digital-id` | You | profile-and-roster-import | not started |
| `feat/calendar` | You | notifications-and-calendar-core | not started |
| `feat/lost-and-found` | You | digital-id | not started |
| `feat/events` | You | calendar, community-chat | not started |
| `feat/friends` | You | profile-and-roster-import | not started |
| `feat/organizer-access` | You | events, auth-and-roles | not started |
| `chore/pwa-and-performance` | You | all features | not started |
| `feat/complaints-core` | Kushal | notifications-and-calendar-core | not started |
| `feat/complaints-escalation` | Kushal | complaints-core | not started |
| `feat/complaints-tracker-and-upvotes` | Kushal | complaints-core | not started |
| `feat/meet-availability` | Kushal | notifications-and-calendar-core | not started |
| `feat/meet-booking` | Kushal | meet-availability | not started |
| `feat/meet-online-call` | Kushal | meet-booking | not started |
| `feat/meet-whiteboard` | Kushal | meet-online-call | not started |
| `feat/acad-resources-core` | Kedar | auth-and-roles | not started |
| `feat/acad-browse-and-filter` | Kedar | acad-resources-core | not started |
| `feat/acad-processing-pipeline` | Kedar | acad-resources-core | not started |
| `feat/flashcards` | Kedar | acad-processing-pipeline | not started |
| `feat/doubt-chat` | Kedar | acad-processing-pipeline | not started |
| `feat/community-core` | Kedar | roster import | not started |
| `feat/community-chat` | Kedar | community-core | not started |
| `feat/community-tags` | Kedar | community-chat | not started |
| `feat/clubs-core` | Kedar | community-core | not started |
| `feat/clubs-join-and-payments` | Kedar | clubs-core | not started |

Detailed checklists per branch are in `TEAM_TASKS.md`.

Note on dependencies: `feat/community-core` auto-creates groups from the roster, so it needs `feat/profile-and-roster-import` merged first. Where two rows could collide (for example `feat/events` using the chat component), the later branch waits or works against the agreed helper and component signatures.

---

## 13. Amending this contract
Anyone can propose a change through a `docs-change` pull request with the reason. All three approve. Record the change and date at the bottom of this file.

### Change log
| Date | Change | Approved by |
|---|---|---|
| 2026-10-02 | Initial contract | (all three sign off by approving this pull request) |
