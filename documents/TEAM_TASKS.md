# Team Tasks: Branches and Checklists

Three owners: **You**, **Kushal**, **Kedar**. Work is split by feature area, so each person owns their own tables, folders and branches. No dates here; each list is in dependency order (do top to bottom within a person's list).

## How the split is balanced
| Owner | Area | Features |
|---|---|---|
| **You** | Platform, identity, campus life | Foundation and shell, auth and roles, presence (IN/OUT), profile and digital ID, notifications, calendar, lost and found, events, friends |
| **Kushal** | Campus operations | Complaints (routing, escalation, upvotes, tracker), meet (availability, booking), online call with whiteboard |
| **Kedar** | Academic and social | Resources portal, flashcards, doubt chat, communities and chat, clubs |

Why this way: complaints and meet are logic-heavy and share one theme (workflows with states and timers), so one person holds both. Resources, AI and communities share content and chat plumbing, so Kedar holds those. Your area carries the shared foundation plus the features that depend on identity (ID, presence, lost and found uses ID at pickup, calendar and notifications are consumed by everyone).

---

## Git workflow (everyone)
- `main` is protected: only merged through pull requests, auto-deploys to production. Nobody pushes directly.
- `develop` is the integration branch, deployed to the shared preview URL. **All feature pull requests target `develop`.** `develop` merges into `main` when the team agrees it is stable.
- Branch names: `feat/<area>-<slice>` for features, `fix/<area>-<what>` for bug fixes, `chore/<what>` for setup, `docs/<what>` for documentation.
- One branch = one slice (migration, policies, schema, logic, UI, tests). Keep pull requests small.
- Every pull request needs one review from a teammate and passing CI (lint, typecheck, tests).
- Update from develop often: `git fetch origin && git rebase origin/develop`.
- Migrations: files are `supabase/migrations/<timestamp>_<owner>_<what>.sql`. Only the owner of a table writes migrations for it. Never edit a merged migration; add a new one. If two migrations conflict, the later branch rebases and renames.
- Delete branches after merge.

Setup commands (one person, once):
```
git init && git branch -M main
git checkout -b develop && git push -u origin main develop
```

---

## Stage 0: Foundation (You do this first; Kushal and Kedar prepare in parallel)

### You: branch `chore/project-setup`
- [x] Create repo, add Kushal and Kedar as collaborators, protect `main` and `develop`
- [x] Add `PLAN.md`, `DESIGN.md`, `AGENTS.md`, `TEAM_TASKS.md` to the repo root
- [x] Next.js (App Router, TypeScript strict), Tailwind, shadcn/ui, Lucide, ESLint, Prettier
- [x] Vitest and Playwright set up with one sample test each
- [x] GitHub Actions: lint, typecheck, test on every pull request
- [x] Vercel project: production from `main`, preview from `develop` and pull requests
- [x] Folder structure from `PLAN.md` section 7, `.env.example`, README with setup steps
- [x] Merge into `develop`. **Kushal and Kedar branch from here.**

### You: branch `feat/design-tokens`
- [x] `src/styles/tokens.css` with all colors for light and dark from `DESIGN.md`
- [x] Tailwind config mapped to tokens; fonts through `next/font`
- [x] `src/lib/motion.ts` with the three motion tokens
- [x] Shared UI kit restyled from shadcn: button, input, card, chip, dialog, sheet, toast, tabs, avatar, empty state

### You: branch `feat/auth-and-roles`
- [x] Supabase project connected; environment variables set in Vercel and locally
- [x] Migrations: `profiles`, `user_roles`, `roster_import`, `login_attempts` with RLS
- [x] Custom email sender configured in Supabase (transactional service or college SMTP) with the sender domain set up so codes do not land in spam
- [x] Sign-in page: enter college email, then 6-digit code; same response whether or not the email is registered
- [x] Only roster emails (not `inactive`) can receive a code; account and profile are created from the roster row on first successful code
- [x] Code rules: single-use, short expiry, limited wrong attempts; rate limits per IP and per email; attempts logged
- [x] Block sign-in and end sessions when the roster marks a person `inactive`
- [x] Admin account protection: invite-only, authenticator app code (2FA) on top of the email code
- [x] "Sign out of all devices"
- [x] No passwords, no Google or social sign-in anywhere
- [x] Role resolution (student, teacher, admin, authority roles) and route guards
- [x] Seed data: one admin, two teachers, five students (fake emails and IDs; a development setting that prints codes to the console instead of sending email)
- [x] Tests: allowed and denied access for each role; wrong or expired or reused code fails; email not on roster gets no account; rate limit works; inactive person cannot sign in

### You: branch `feat/app-shell`
- [x] Sidebar, top bar (ID chip and IN/OUT pill placeholders, bell), profile at sidebar bottom
- [x] Role-based navigation (student and teacher nav differ)
- [x] Mobile bottom tab bar, dark mode toggle, loading and error layouts

### You: branch `feat/notifications-and-calendar-core`
- [x] Migrations: `notifications`, `calendar_entries`, `audit_log`, `events_outbox` with RLS
- [x] Helpers: `notify(userId, type, payload)`, `addCalendarEntry(...)`, `writeAudit(...)`
- [x] Bell dropdown reading notifications with Realtime, unread count, mark as read
- [x] Tests for helpers
- [x] Merge to `develop` and announce in team chat that shared helpers are ready

### Kushal and Kedar, while waiting (no code on `develop` yet): branch `docs/<area>-spec`
Kushal: `docs/complaints-and-meet-spec`
- [x] `features/complaints/README.md`: domains list, escalation levels, SLA values, states, anonymity rules, sensitive domains
- [x] `features/meet/README.md`: availability model, request states, offline and online flows, cancellation rules
- [ ] Contact administration to confirm real complaint authorities and response times

Kedar: `docs/acad-and-community-spec`
- [x] `features/acad/README.md`: resource fields, filters, approval flow, storage rules
- [x] `features/community/README.md`: community kinds (official and unofficial), channels, tag thresholds, moderation rules
- [x] `features/clubs/README.md`: club page contents, join flow, free and paid paths
- [ ] Ask the college office for roster data and subject lists per branch and year

---

## You: remaining branches (after Stage 0)

### `feat/presence-toggle`
- [ ] Migration: `campus_zones` (campus zone first), `presence_consent` with RLS
- [ ] Admin screen to draw the campus polygon (named zones come in the monitoring branch)
- [ ] Consent screen in plain language; pause and revoke controls in the pill popover
- [ ] Server-side boundary check (point in polygon) using browser location
- [ ] IN/OUT pill with checking, permission denied and offline states, plus "last verified" popover
- [ ] Privacy setting for who can see your status (nobody, friends, everyone; friends part wired later)
- [ ] No data stored until consent is recorded
- [ ] Tests for inside, outside, low accuracy and denied cases

### `feat/presence-monitoring`
- [ ] Migrations: `presence_heartbeats`, `presence_sessions`, `presence_daily` with RLS and retention settings in a config table
- [ ] Heartbeat endpoint: server evaluates position against zones, stores state, zone, accuracy and confidence; never stores coordinates; never records location when outside campus
- [ ] Campus network check: compare request IP with admin-managed campus IP ranges and raise confidence
- [ ] Client heartbeat while the app is visible, configurable interval, backs off on battery saver and offline
- [ ] Session logic: open on verified IN, extend on heartbeat, close on verified OUT or timeout (marked "signal lost"); idempotent and safe on duplicate heartbeats
- [ ] Three states in the pill and popover: inside, outside, unknown ("Last seen on campus 40 min ago")
- [ ] Scheduled jobs: nightly rollup into `presence_daily`; delete raw heartbeats past retention; delete or anonymize old sessions after the term
- [ ] "My time on campus" page: sessions and daily summary, and an export of everything stored about me
- [ ] Admin: manage named zones (hostel, library, classrooms) and campus IP ranges; aggregate dashboard only; individual lookup requires a reason and writes `audit_log`
- [ ] Teacher view: aggregate attendance for their own classes, within class time only (hook for later attendance feature)
- [ ] Tests: consent required, revoke stops collection, timeout closes session, missing heartbeats show as unknown, teacher cannot see outside class window, denied lookups without a reason
- [ ] Later (separate branch): native app sends OS geofence enter and exit events through the same endpoint with `source = native`

### `feat/profile-and-roster-import`
- [ ] Admin page to upload roster CSV with validation and error report; matches on college email, carries enrollment number or staff ID, rejects duplicate emails or IDs, sets status `invited` for new rows and `inactive` for people removed
- [ ] Profile page (view and limited edit), photo upload
- [ ] Teacher profile fields (department, subjects, office hours text)

### `feat/digital-id`
- [ ] Short-lived signed token endpoint (30 second expiry)
- [ ] ID card component with rotating QR, countdown, verified-at line
- [ ] `/verify` page for guards and desks: scan, show name, photo, status
- [ ] Verifier role and admin revoke or suspend
- [ ] Tests: expired token fails, revoked ID fails, tampered token fails

### `feat/calendar`
- [ ] Day, week, agenda views reading `calendar_entries`
- [ ] Source filters, source colors from `DESIGN.md`, personal items create and edit
- [ ] Home page "today" block reusing the calendar query

### `feat/lost-and-found`
- [ ] Migrations: `lost_found_items`, `lost_found_claims`, `lost_found_events` with RLS (hidden verification detail never returned by general queries)
- [ ] Report lost and report found forms (category, photos, location list, time window)
- [ ] Drop-off point flow with handover code for finders
- [ ] Match suggestions (category, location, time, text similarity) and notifications to both sides
- [ ] Claim with verification question, desk review, pickup confirmed using the claimant's digital ID
- [ ] State machine with every transition logged; auto-expiry job; admin disposal list
- [ ] Abuse report button and daily posting limit

### `feat/events`
- [ ] Migrations: `events`, `event_rsvps`
- [ ] Event list with college and external tabs, detail page, RSVP
- [ ] Create event form with approval step for college-wide visibility
- [ ] Add to calendar through `addCalendarEntry`
- [ ] Optional team formation and event chat (reuses Kedar's chat component when ready)

### `feat/organizer-access`
- [ ] Migration: `external_organizers` with RLS (organizer role can reach event tables only)
- [ ] Separate `/organizer/sign-in` and registration page (organization details, email one-time code), linked from the Events page; reject emails that are on the college roster
- [ ] Admin approval queue: approve, reject, suspend, mark trusted
- [ ] Organizer dashboard: create, edit and cancel own events, post updates, see RSVP counts and RSVP list
- [ ] New events from non-trusted organizers go to the approval queue; label "External organizer: <organization>" on every external event
- [ ] "Report event" button for students; rate limit on event creation; link and image checks
- [ ] Tests: organizer cannot read complaints, resources, communities, presence or profiles; suspended organizer is blocked immediately; unapproved organizer cannot post

### `feat/friends`
- [ ] Migration: `friendships` with RLS
- [ ] Search, send and accept requests, friends list, remove
- [ ] Wire presence visibility to friends
- [ ] Profile view for friends and public profile for others

### `chore/pwa-and-performance`
- [ ] Installable PWA, push notifications through the notifications table
- [ ] Accessibility audit against `DESIGN.md` section 11
- [ ] Load test with simulated concurrent users; fix slow queries and add indexes

---

## Kushal: branches (start after Stage 0 is merged)

### `feat/complaints-core`
- [x] Migrations: `complaint_domains`, `domain_assignees`, `complaints`, `complaint_events`, `complaint_attachments` with RLS
- [x] Seed domains and an example chain per domain (clearly labelled seed values)
- [x] Raise complaint form: domain picker (nested), problem description, attachments, anonymous option
- [x] "My complaints" list with status chips
- [x] Handler view for complaints assigned to the logged-in authority
- [x] Resolve flow with note; student confirm or reopen; auto-close after the confirmation window
- [x] Notifications on every state change using `notify()`

### `feat/complaints-escalation`
- [x] Edge Function plus scheduled job that escalates overdue complaints to the next level (idempotent: running twice never escalates twice)
- [x] Complaint timeline component showing every level and time
- [x] Top-level behaviour: flag "needs admin attention" and notify admin
- [x] Sensitive domains (ragging, harassment) route directly to the committee and never appear on the public tracker
- [x] Tests with shortened SLAs covering each level, resolved before due, and double-run safety

### `feat/complaints-tracker-and-upvotes`
- [ ] Migration: `complaint_upvotes` with unique constraint per user and complaint
- [ ] Similar-complaint suggestions while typing (full text search and similarity)
- [ ] Upvote button; upvotes raise priority and shorten the next SLA slightly
- [ ] Public tracker: sorted by longest pending by default, filters by domain and status
- [ ] Duplicate handling: handler can mark "closed as duplicate" and merge upvotes

### `feat/meet-availability`
- [ ] Migrations: `availability_rules`, `availability_exceptions`
- [ ] Teacher screen: weekly slots and one-off exceptions
- [ ] Slot generation on read with short caching
- [ ] Student view: browse teachers and open slots

### `feat/meet-booking`
- [ ] Migration: `session_requests` with an exclusion constraint preventing overlapping accepted sessions per teacher
- [ ] Student request with reason; teacher accept or decline; student chooses offline (location) or online after acceptance
- [ ] Calendar entries for both and notifications through shared helpers
- [ ] Reminders job; cancel and reschedule rules from the spec
- [ ] Test: two simultaneous requests for one slot, exactly one succeeds and the other gets a clear message

### `feat/meet-online-call`
- [ ] LiveKit room created on accept; join page restricted to the two participants within the time window
- [ ] Call UI (camera, mic, leave) following `DESIGN.md`
- [ ] Early version may use an embedded room link; replace with LiveKit components

### `feat/meet-whiteboard`
- [ ] tldraw room per booking with multiplayer sync
- [ ] Save snapshot when the session ends; view past whiteboards from the booking
- [ ] Permission check: only participants can open the room

---

## Kedar: branches (start after Stage 0 is merged)

### `feat/acad-resources-core`
- [ ] Migrations: subjects, `resources` with RLS and a storage bucket with policies
- [ ] Upload form for teachers and students (year, branch, subject, type, file)
- [ ] Student uploads start as `pending`; teacher approval queue with approve and reject reason
- [ ] Signed URL download and view

### `feat/acad-browse-and-filter`
- [ ] Resource list defaulting to the student's own year and branch
- [ ] Filters: year, branch, subject, type; search by title and subject
- [ ] Resource detail page; saved or bookmarked resources
- [ ] Empty and loading states, mobile layout

### `feat/acad-processing-pipeline`
- [ ] Edge Function: on approved upload, extract text, chunk, create embeddings in `pgvector`
- [ ] Table `resource_chunks`; status shown on the resource (processing, ready, failed) with retry
- [ ] Usage table `ai_usage` and per-user daily limit helper

### `feat/flashcards`
- [ ] Migrations: `flashcard_decks`, `flashcards`, `flashcard_reviews`
- [ ] Generate a deck from a selected resource with Gemini, grounded in chunks, each card linked to its source page
- [ ] Study view with flip and rating; simple spaced repetition scheduling
- [ ] Edit, delete and regenerate cards; daily limit respected

### `feat/doubt-chat`
- [ ] Retrieval-augmented chat scoped to one resource or one subject
- [ ] Answers show citations to resource and page; if retrieval is weak the bot says it could not find it
- [ ] Chat history per user and resource; limit and error states

### `feat/community-core`
- [ ] Migrations: `communities`, `community_members` with RLS
- [ ] Auto-create official communities from the roster: year, subject, batch; teacher-moderated
- [ ] Unofficial communities created by students; join, leave, member list
- [ ] Community list and discovery with filters

### `feat/community-chat`
- [ ] Migrations: `messages`, `message_votes`
- [ ] Realtime chat with replies, reactions, attachments, unread counts
- [ ] Reusable chat component exported through `shared/` for events and clubs
- [ ] Report message, mute, moderator actions, rate limiting

### `feat/community-tags`
- [ ] Migration: `community_tags`
- [ ] Upvote on replies; database trigger awards tags (for example Helper, Doubt solver) at configurable thresholds per community
- [ ] Tags shown next to names in chat and on profiles

### `feat/clubs-core`
- [ ] Migrations: `clubs`, `club_members`, `club_notices` with RLS
- [ ] Clubs directory with preview of what each club offers; club page with notices, events list and community room
- [ ] "My clubs" page; club lead tools for notices and member list

### `feat/clubs-join-and-payments`
- [ ] Join request flow; lead approval for free clubs
- [ ] Payment for paid clubs through the payment provider; membership activates only after a verified server-side webhook, never from a client redirect
- [ ] Status chips: requested, payment pending, member, rejected; refund or failed payment handling

---

## Shared rules while building
- **Cross-feature links** go only through `notify()`, `addCalendarEntry()` and `events_outbox`. No feature imports another feature's folder.
- **Shared UI and chat components** live in `shared/`. If you need a change to something owned by another person, post a one-line request with the file or function name and continue with other work until it lands.
- **Owner of files:** You own `src/app/layout`, auth, shell and `shared/ui`. Kushal owns `features/complaints` and `features/meet`. Kedar owns `features/acad`, `features/community` and `features/clubs`. You own the rest.
- **Definition of done** for every branch is in `AGENTS.md` section 4. Paste it into every agent session.

## Agent session starter (use for every branch)
```
Read PLAN.md, DESIGN.md and AGENTS.md. We are working on branch <branch-name>.
Spec: features/<area>/README.md. First write a plan listing files, tables and risks.
Wait for my approval before changing the database schema. Then implement only this slice,
add tests, and finish with a summary of what changed and how to test it.
```
