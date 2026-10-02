# Campus App: Architecture and Implementation Plan

Working name: TBD. Team: three developers (call them Dev A, Dev B, Dev C). Built with an AI coding agent. This file is the source of truth for what we build, with what, and why. `DESIGN.md` is the source of truth for UI. `AGENTS.md` is how the agent must work.

---

## 1. Goals and constraints
- One platform for students and teachers (admins and authority holders are needed internally, see section 4).
- Must feel cohesive: features share one identity, one notification system and one calendar.
- Must handle bursts (many students requesting teacher slots or opening the app between lectures at the same time).
- Team of three students with limited time, AI-assisted coding. So: few moving parts, managed services, strong conventions, vertical slices.
- Web first, mobile app later. So: backend logic must not live in UI code.

## 2. Tech stack and why

| Layer | Choice | Why this and not the alternative |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | One codebase for UI and server routes, huge ecosystem, the agent knows it very well. TypeScript types catch agent mistakes early |
| UI | Tailwind CSS + shadcn/ui + Lucide icons | Token-driven styling matches `DESIGN.md`; components are copied into the repo so the agent can edit them freely |
| Database | PostgreSQL on Supabase | Relational data fits this domain (users, hierarchies, bookings, memberships). Postgres gives constraints, transactions, row level security, full text search and vectors in one place |
| Auth | Supabase Auth with email one-time codes (OTP), limited to emails on the imported roster; separate email-code sign-in for external organizers | No passwords to leak or reset, and identity is proven by access to the college mailbox. The roster decides who can exist; outsiders can only reach a locked-down organizer area after admin approval. Needs a proper email sender for production |
| Authorization | Postgres Row Level Security + role checks in server code | Security enforced at the database, so a buggy page cannot leak data |
| Realtime | Supabase Realtime (Postgres changes and broadcast) | Chat, notifications and live issue counts without running our own WebSocket server |
| File storage | Supabase Storage with signed URLs | PDFs, lost-and-found photos, event posters. Access rules tied to RLS |
| Background jobs and scheduling | `pg_cron` + Supabase Edge Functions | Complaint escalation, lost-and-found expiry, session reminders. Runs next to the data, no extra server |
| Video calls | LiveKit Cloud (WebRTC) | Reliable 1 on 1 and group calls, generous free tier, React components available. Fallback for early MVP: embed a Jitsi room link |
| Collaborative whiteboard | tldraw with its sync layer (or Yjs for sync) | Ready-made whiteboard with multiplayer; avoids building a canvas engine |
| AI: flashcards and doubt chat | Gemini API + retrieval over resource PDFs with `pgvector` | Answers are grounded in the uploaded resources, not hallucinated. Same provider as the coding agent |
| Validation | Zod schemas shared by client and server | One contract per feature, the agent cannot drift between UI and API |
| Data access | Supabase generated types + SQL migrations in repo | Typed queries, reviewable schema history. Prefer plain SQL migrations over an ORM so RLS policies live with the schema |
| Testing | Vitest (unit), Playwright (end-to-end for core flows) | Agent-written code needs tests as a safety net |
| Hosting | Vercel (app) + Supabase (backend) | Free or cheap tiers, preview deployments for every pull request |
| Mobile later | Same Supabase backend; app in React Native/Expo or a PWA first | Ship a PWA early (installable, push notifications) before deciding on native |

Why a modular monolith, not microservices: three developers cannot operate many services. One Next.js app with strict feature folders gives the same separation of code, and any feature can be extracted later.

Why Supabase over Firebase: our data is relational and permission heavy (hierarchies, memberships, bookings with constraints). Firestore would push that logic into application code.

## 3. System architecture

```
 Browser (student / teacher / admin)
        │
        ▼
 Next.js on Vercel
   ├─ UI (React server and client components)
   ├─ Server actions and route handlers (validated with Zod)
   └─ Feature modules (src/features/*)
        │
        ▼
 Supabase
   ├─ Auth (college email + OTP; organizer email OTP)
   ├─ Postgres (+ RLS, constraints, triggers, pgvector)
   ├─ Realtime (chat, notifications)
   ├─ Storage (PDFs, photos)
   └─ Edge Functions + pg_cron (escalation, expiry, reminders, AI jobs)
        │
        ├─ LiveKit (calls)
        ├─ tldraw sync (whiteboard)
        └─ Gemini API (flashcards, doubt chat, embeddings)
```

### Cross-cutting systems (build once, every feature uses them)
1. **Identity and roles:** `profiles` table plus `user_roles`. Roles: `student`, `teacher`, `admin`, and scoped authority roles (see section 4).
2. **Notifications:** every feature writes to a `notifications` table through one helper `notify(userId, type, payload)`. Realtime pushes to the bell. Later: email and push.
3. **Calendar:** a single `calendar_entries` table. Features never build calendar UI; they insert an entry (`source_type`, `source_id`, `user_id`, `starts_at`, `ends_at`). Meets, events, club events, timetable and complaint follow-up dates all appear in one place.
4. **Audit log:** an append-only `audit_log` for complaints, ID verification, role changes.
5. **Domain events:** features emit rows into an `events_outbox` table when something important happens (complaint escalated, session accepted). Edge Functions consume them to send notifications and create calendar entries. This keeps features decoupled.

## 4. Roles and permissions
You said Students and Teachers for now. The complaint hierarchy and admin tasks need more, so the model includes them from day one even if the UI comes later:
- `student`, `teacher` (the two launch roles)
- `admin` (manages the roster, domains, campus zones, organizer approvals, sees everything)
- `organizer` (external: a third party or another college that wants to post events; see section 4.1; has no access to campus data)
- Authority roles stored as assignments, not hardcoded: for example "Hostel warden", "Class coordinator", "HOD", "Principal", assigned per domain in `domain_assignees`. Many authority holders will also be teachers; a person can have multiple roles.

### 4.1 Sign-in and identity

**Who signs in how**
| Person | Sign-in | Notes |
|---|---|---|
| Student | College email + one-time code (OTP) sent to that email | No passwords. The email must be in the college roster |
| Teacher | College email + one-time code | Same flow; no separate staff ID needed for sign-in |
| Admin | College email + one-time code + authenticator app code (2FA) | Admin accounts are invite-only and carry the most power, so they get a second factor |
| External organizer (third party or another college) | Separate page, email one-time code | Can only post and manage their own events after admin approval |

**How college sign-in works**
1. The user opens the sign-in page and enters their college email.
2. The server checks the email against the roster (the list the admin imported). Only emails on the roster that are not `inactive` get a code. The screen always says "If this email is registered, we sent a code", so nobody can probe which emails exist.
3. The user types the 6-digit code from their inbox. Codes expire after a few minutes, work once, and lock after a few wrong attempts.
4. On the first successful code, the account is created and the profile is prefilled from the roster row (name, enrollment number or staff ID, branch, year, division, batch, role). Later sign-ins skip creation.
5. The session is a secure cookie with refresh; there is a "sign out of all devices" button.

**Why this is solid**
- Identity comes from the college mailbox plus the roster. Someone who knows an enrollment number cannot sign in, because they cannot read that student's inbox.
- The enrollment number stays the student's unique ID (`college_id`) on the profile and the digital ID card; it just is not used to sign in.
- No passwords means nothing to leak, reset or forget.

**Things the team must handle**
- **Email delivery is the weakest link.** Supabase's built-in email sender has very low limits and is only meant for testing, so production needs a custom email service (for example Resend, Brevo or the college's own SMTP) with the sender domain set up properly (SPF, DKIM) so codes do not land in spam. If many students sign in at once between lectures, delivery speed matters.
- **Everyone needs a working college mailbox.** If some students do not have or never check their college email, an admin can set a verified alternate email for that person in the roster; the rule stays "the email must be in the roster".
- Rate limits per IP and per email on requesting codes and on verifying them; failed attempts are logged (`login_attempts`).
- When the roster marks someone `inactive` (graduated, left), sign-in is blocked and active sessions end.
- Admins need an authenticator app code in addition to the email code.

**External organizers (third parties and other colleges)**
- Separate entry at `/organizer/sign-in`, linked from the Events page ("Hosting an event? Organizer access"), not from the student sign-in.
- Registration asks for name, organization, organization type (company, club, college, community), contact email, optional phone and website, and what they want to host. The email is verified with a one-time code. Emails that are on the college roster are rejected here, because roster members use the normal sign-in and create events through their club or department.
- **Admin approval is required** before an organizer account works. Admin can approve, reject, suspend, or mark an organizer as trusted.
- **What organizers can do:** create, edit and cancel their own events, post updates on them, see RSVP counts and the list of people who RSVP'd to their events. Every new event goes into the approval queue before it is public, unless the admin marked the organizer as trusted.
- **What organizers cannot do:** see complaints, resources, communities, presence, the student directory, friends, the calendar of anyone else, or any campus data. Row level security gives the `organizer` role access to event tables only.
- Their events are labelled "External organizer: <organization>" so students never mistake them for official college events.
- Abuse controls: rate limits on event creation, link and image checks, a "Report event" button for students, and instant suspension by admin.

## 5. Feature designs (the thinking behind each)

### 5.1 Campus presence: status toggle and continuous monitoring
Two layers that share one pipeline:
1. **Presence status:** the IN/OUT pill in the top bar. It answers "is this person on campus right now?" with a verified state.
2. **Presence monitoring:** a continuous record of time spent on campus, built from sessions, so the system knows *how long* and *when*, not only the latest check-in. This feeds attendance (later), safety features and the student's own "time on campus" summary.

**How monitoring works**
- Each device reports a **heartbeat** while the app is active: the server checks the position against the campus polygon (and named zones), and stores the result as `inside`, `outside` or `unknown`, with accuracy and a confidence level. The decision is always made server-side.
- A **presence session** opens on the first verified IN and stays open as long as heartbeats keep arriving. It closes on a verified OUT, or when heartbeats stop for a configurable timeout (the session is then closed at the last heartbeat and marked "signal lost", not "left").
- A nightly job rolls sessions into `presence_daily` (first in, last out, minutes on campus, number of sessions). Raw heartbeats are short-lived; sessions and daily summaries are what we keep.
- **Zones:** the campus is one zone of kind `campus`; admin can add named zones inside it (hostel, library, ground, department blocks, classrooms). Heartbeats record the zone, so monitoring can answer "was the student in the library" and later "was the student in the lecture room during the class". Zones are optional for MVP; the campus zone is required.
- **Three states, not two:** `inside`, `outside`, `unknown`. A stale signal is shown as "Last seen on campus 40 min ago", never as "outside". Gaps are unknown, not absence.

**Signals and honest limits**
| Signal | What it gives | Limit |
|---|---|---|
| Browser location heartbeat (foreground) | Position while the app is open and visible | Browsers cannot track in the background; spoofable; weak indoors |
| Campus network check (server compares the request IP with the campus public IP ranges) | Strong, cheap "on campus network" signal whenever the app is open on campus Wi-Fi | Only works on campus Wi-Fi; mobile data users are not covered |
| QR scan at gates, library, classrooms | Strong point-in-time proof tied to a place | Needs scanners or printed codes; not continuous |
| Native app with OS geofencing (later, Expo) | Real continuous monitoring: the OS reports campus enter and exit events in the background with low battery use | Needs the app, background location permission, and store approval |

- Confidence is computed per heartbeat: high (location inside and campus network or QR agree), medium (one strong signal), low (location only with poor accuracy). Anything that will affect attendance later must require high confidence.
- **Web MVP:** foreground heartbeats plus the campus network check. This gives continuous monitoring while the app is open, which is what a browser can honestly offer. **True background monitoring requires the native app**, so the plan includes it as a follow-up and the data model does not change when it arrives (the app simply sends enter and exit events and heartbeats as another `source`).
- Heartbeat interval is a config value (start around every few minutes while visible, slower on battery saver) to keep battery and server load low.

**Privacy and consent (continuous tracking is much more sensitive than a toggle)**
- **Opt-in with a plain-language consent screen** before any monitoring starts: what is collected, who can see it, how long it is kept. Consent is stored in `presence_consent`, and can be paused ("Pause sharing") or revoked at any time. Revoking stops collection immediately.
- **No tracking outside campus.** When the position is outside the campus polygon, we record only `outside`, never where the person is.
- **No raw coordinates stored.** The server evaluates the position and stores state, zone, accuracy and confidence. Coordinates exist only in the request.
- **Who sees what:** the student sees their full history. Friends see only IN/OUT, and only if the student allows it. Teachers see attendance only for their own classes and only inside the class time window. Admins see aggregates; looking up one individual requires a reason and is written to the audit log.
- **Retention:** raw heartbeats are deleted after a short, configurable period; sessions and daily summaries are kept for the academic term, then deleted or anonymized.
- **Needs college sign-off:** location monitoring of students is regulated personal data (for example India's DPDP Act requires clear consent and a stated purpose). Agree the policy and purpose with the college before launch, and publish it on the privacy page. This is a decision for the team and the college, not something the code can settle.
- Students can export or view exactly what is stored about them.

### 5.2 Complaints with escalation and tracker
- **Domains** are data, not code: `complaint_domains` (Hostel, Mess, Academics, Infrastructure, Library, Transport, Harassment and ragging, Administration, etc.), optionally nested (Infrastructure → Electrical).
- **Routing rules:** `domain_assignees` maps each domain to an ordered chain of roles or people: Level 1 (e.g. caretaker), Level 2 (coordinator), Level 3 (HOD), Level 4 (principal). Each level has an SLA in hours.
- **Escalation:** a `pg_cron` job runs every 10 minutes: for each open complaint past its level SLA and not resolved, move to the next level, record it in `complaint_events`, notify the new assignee and the student. Escalation stops at the top level and flags "needs admin attention".
- **Duplicates and upvotes:** while typing a title, the form shows similar open complaints (Postgres full text search, trigram similarity, later embeddings). The student can upvote an existing one instead of filing a new one. Upvotes are one per user per complaint (unique constraint). Upvote count raises priority and shortens the next SLA slightly.
- **Tracker:** a public (within college) board sorted by age by default, with filters by domain and status, and a "longest pending" view. This is the pressure mechanism.
- **Privacy:** option to file anonymously to authorities (the system still knows the author for abuse control, assignees do not). Sensitive domains (ragging, harassment) are not public on the tracker and route directly to a committee.
- **Resolution:** the handler marks resolved with a note; the student confirms or reopens within 3 days. Auto-close after that.

### 5.3 Meet: teacher sessions
- **Availability:** teachers define weekly recurring slots and one-off exceptions (`availability_rules`, `availability_exceptions`). Slots are generated on read.
- **Flow:** student requests a slot with a reason → teacher accepts or declines → on accept, student chooses offline (location) or online → calendar entries for both → reminders.
- **Concurrency:** booking is a database transaction with a unique constraint (or exclusion constraint on teacher and time range), so two students cannot take the same slot even if they click at the same instant. Requests use optimistic UI with a clear "slot just taken" message.
- **Scale:** requests are small rows; the load is read-heavy availability queries, which are cached for a few seconds. No queue is needed at campus scale; add one only if profiling shows a need.
- **Online session:** a LiveKit room created on accept (`/meet/[bookingId]`), joinable only by the two participants within the time window. The whiteboard is a tldraw room keyed to the booking. Whiteboard snapshot is saved at the end so they can revisit it.

### 5.4 Profiles and digital ID
- Every user gets a profile (name, photo, branch, year, division, batch, roll number, or employee ID for teachers). Data comes from an admin-imported roster (CSV) matched on college email, so people cannot invent identity. The roster also carries the enrollment number (students) or staff ID (teachers). Sign-in itself is described in section 4.1.
- **Uniqueness:** `college_id` is unique in the database. For students it is the enrollment number from the roster; it is set by the import, never by the student, and cannot be edited from the profile.
- **ID card that is trustworthy:** the card shows a QR containing a short-lived signed token (JWT or HMAC, 30 second expiry) generated server-side. A verifier page (`/verify`, for guards, labs, library) scans it and sees name, photo, status and a green tick. A screenshot expires in 30 seconds, so sharing a picture does not work.
- **Accepted throughout college:** the verifier is a simple web page working on any phone. Later add an offline fallback with a signed token cached for a few minutes, plus a role for "verifier" accounts.
- Admin can revoke or suspend an ID instantly.

### 5.5 Lost and found (a real lifecycle, not create-and-delete)
- **Two report types:** "I lost something" and "I found something". Both have category, description, photos, place on a campus location list, and time window.
- **Finder safety:** a found item is handed to a drop-off point (security desk or department office). The listing records the drop-off point, and the finder gets a handover code. Items are not sitting with random students.
- **Matching:** the system suggests matches between lost and found reports using category, location, time and text similarity (embeddings later). Both sides get notified.
- **Verified claims:** the finder (or desk) can hide one identifying detail from the listing. A claimant must answer a verification question. The desk confirms on pickup using the claimant's digital ID.
- **State machine:** Reported → Matched → Claim under review → Ready for pickup → Returned. Branches: Expired (unclaimed after 30 days, goes to admin disposal list), Rejected claim. Every transition is logged.
- **Hygiene:** auto-expire, report abuse button, per-user daily limit on posts.

### 5.6 Academic resources, flashcards, doubt chat
- Resources have year, branch, subject, type (notes, PYQ, slides), uploader (teacher or student), and status. Student uploads go through teacher approval (`pending → approved`) to keep quality.
- Filters by year, branch, subject, type, and search. Default view is pre-filtered to the student's own year and branch.
- **Processing pipeline:** on upload, an Edge Function extracts text, chunks it, creates embeddings in `pgvector`.
- **Flashcards:** generated from a selected resource with Gemini, grounded in the chunks; each card stores a link back to the source page. Spaced repetition scheduling (simple SM-2) per student.
- **Doubt chat:** retrieval-augmented. The answer cites the resource and page. If retrieval finds nothing relevant, the bot says so instead of guessing. Chat is scoped to one resource or one subject.
- Rate limit AI calls per user per day to control cost.

### 5.7 Communities
- Communities are rooms with channels. **Auto-created structure** from the roster: Year → Subject → Batch (official groups, teacher-moderated) plus unofficial groups created by students.
- Chat is realtime via Supabase. Messages support replies, reactions and upvotes.
- **Helper tags:** a database trigger counts upvotes on replies per community. Crossing thresholds awards tags such as "Helper" or "Doubt solver" (configurable per community). Tags are per community and shown next to the name.
- Moderation: reports, mute, teacher or admin moderator roles. Rate limits to prevent spam.

### 5.8 Clubs
- Club page: description, preview of what it offers, events, notice board, and its own community room.
- **Joining with proof:** join request → (if fee) payment via a payment provider such as Razorpay with webhook confirmation → membership becomes active only when the webhook verifies payment, or when the club lead approves for free clubs. This guarantees the membership is real.
- Club leads manage members, notices, events.

### 5.9 Events
- Two kinds: college events (created by clubs, departments, admin) and external events (hackathons etc.), posted by approved external organizers (section 4.1), added by admin, or curated by a feed later.
- Event creation requires approval for college-wide visibility; events from external organizers always go through the approval queue unless the admin marked the organizer as trusted. Events can be added to the calendar with one tap. Optional team formation and an event chat.

### 5.10 Friends
- Friend requests, accept, remove. Friends see each other's public profile, shared communities and (optionally) online status. Keep privacy controls simple: who can see your IN/OUT status (nobody, friends, everyone).

### 5.11 Calendar
- Aggregates `calendar_entries` from every module. Day, week, agenda views. Filters by source. Quick create for personal items. "Today" is the home page's first block.

## 6. Data model (core tables)

```
profiles(id, college_email UNIQUE, full_name, photo_url, college_id UNIQUE, role_primary, branch, year, division, batch, status)
user_roles(user_id, role, scope)                         -- admin, authority roles
roster_import(college_email UNIQUE, college_id, full_name, branch, year, division, batch, role, status)   -- college_id: enrollment number or staff ID; status: invited, active, inactive
login_attempts(id, email, ip, at, kind, success)          -- kind: code_request, code_verify
external_organizers(user_id, organization, org_type, contact_email, phone, website, purpose, status, trusted, approved_by, approved_at)   -- status: pending, approved, rejected, suspended
presence_consent(user_id, granted_at, paused_until, revoked_at)
campus_zones(id, name, kind, polygon, active)            -- kind: campus, hostel, library, classroom, ...
presence_heartbeats(id, user_id, at, state, zone_id, accuracy_m, source, confidence)   -- short retention
presence_sessions(id, user_id, started_at, ended_at, end_reason, source, min_confidence)
presence_daily(user_id, date, first_in, last_out, minutes_on_campus, sessions)

complaint_domains(id, parent_id, name, visibility, routing_mode)
domain_assignees(domain_id, level, assignee_user_id|assignee_role, sla_hours)
complaints(id, author_id, domain_id, title, body, status, current_level, anonymous, created_at, due_at, resolved_at)
complaint_events(id, complaint_id, type, from_level, to_level, actor_id, note, at)
complaint_upvotes(complaint_id, user_id) UNIQUE(complaint_id, user_id)
complaint_attachments(id, complaint_id, storage_path)

availability_rules(id, teacher_id, weekday, start_time, end_time, slot_minutes)
availability_exceptions(id, teacher_id, date, start_time, end_time, kind)
session_requests(id, student_id, teacher_id, starts_at, ends_at, reason, status, mode, location, room_id)
  EXCLUDE no overlapping accepted sessions per teacher

id_tokens(id, user_id, issued_at, expires_at)             -- or stateless signed tokens
lost_found_items(id, kind, reporter_id, category, title, description, location_id, occurred_at, status, drop_off_point, hidden_detail, verification_question)
lost_found_claims(id, item_id, claimant_id, answer, status, reviewed_by)
lost_found_events(id, item_id, type, actor_id, at)

resources(id, title, subject_id, year, branch, type, uploader_id, storage_path, status, approved_by)
resource_chunks(id, resource_id, page, content, embedding vector)
flashcard_decks(id, resource_id, owner_id) / flashcards(id, deck_id, front, back, source_page)
flashcard_reviews(card_id, user_id, due_at, interval, ease)
ai_usage(user_id, day, calls)

communities(id, kind, name, official, year, branch, subject_id, batch)
community_members(community_id, user_id, role)
messages(id, community_id, author_id, parent_id, body, created_at)
message_votes(message_id, user_id)
community_tags(community_id, user_id, tag, awarded_at)

clubs(id, name, description, fee, lead_id, community_id)
club_members(club_id, user_id, status, payment_ref)
club_notices(id, club_id, body, at)

events(id, kind, title, description, starts_at, ends_at, location, organizer_id, club_id, status, external_url)
event_rsvps(event_id, user_id)

friendships(user_a, user_b, status)
calendar_entries(id, user_id, source_type, source_id, title, starts_at, ends_at)
notifications(id, user_id, type, payload, read_at, created_at)
audit_log(id, actor_id, action, entity, entity_id, at, meta)
events_outbox(id, type, payload, processed_at)
```

Rules for the agent: every table has `created_at`, RLS enabled with explicit policies, foreign keys with sensible `on delete`, and indexes on columns used in filters.

## 7. Code structure

```
/
├─ DESIGN.md  PLAN.md  AGENTS.md
├─ supabase/
│  ├─ migrations/        # numbered SQL, one concern each
│  ├─ functions/         # edge functions (escalate, embed-resource, notify)
│  └─ seed.sql
├─ src/
│  ├─ app/               # routes only: thin pages that compose features
│  │  ├─ (auth)/  (student)/  (teacher)/  (admin)/
│  ├─ features/
│  │  ├─ presence/  complaints/  meet/  identity/  lostfound/
│  │  ├─ acad/  community/  clubs/  events/  friends/  calendar/
│  │  │  └─ each has: components/ actions.ts queries.ts schema.ts types.ts README.md
│  ├─ shared/            # ui kit, hooks, notify(), calendar helpers, auth guards
│  ├─ lib/               # supabase clients, motion tokens, utils
│  └─ styles/tokens.css
├─ tests/                # playwright e2e for core flows
└─ docs/adr/             # one short file per architecture decision
```
Rule: a feature may import from `shared` and `lib` but never from another feature. Cross-feature links go through `calendar_entries`, `notifications` and `events_outbox`. This is what lets three people work in parallel without conflicts.

## 8. Phased delivery

### Phase 0: Foundation (week 1, everyone together)
Goal: a deployed empty shell all three can build into.
- Repo, Next.js, Tailwind tokens from `DESIGN.md`, shadcn setup, Lucide.
- Supabase project, college email OTP sign-in limited to the roster, custom email sender, roster import, `profiles`, `user_roles`.
- App shell (sidebar, top bar with ID and IN/OUT placeholders, bell), role-based nav, dark mode.
- `notifications`, `calendar_entries`, `audit_log` tables and helpers.
- CI: lint, typecheck, tests on pull requests; Vercel previews.
- Decide the name, logo and campus polygon.
- Exit test: a student and a teacher can log in and see their own shell.

### Phase 1: MVP (weeks 2 to 5)
Scope is chosen to prove the core value: **identity, presence, voice (complaints) and access (teachers, resources)**, all connected through one calendar and one notification bell.
1. IN/OUT presence toggle with server-side boundary check, plus continuous presence monitoring (consent, heartbeats, sessions, daily summary, campus network check).
2. Profile and digital ID with rotating QR and verifier page.
3. Complaints: domains, routing, escalation job, upvotes, duplicate suggestions, tracker.
4. Meet: availability, request, accept/decline, offline/online choice, calendar entries, reminders. Online calls use a simple embedded room link; the whiteboard follows in Phase 2.
5. Acad resources: upload, approval, filters by year and branch.
6. Calendar: unified view fed by meets and resources deadlines.
7. Home: today's calendar, pending items, quick actions.

MVP exit criteria: 20 real students and 3 teachers use it for a week; a complaint escalates correctly in a test with shortened SLAs; two simultaneous booking attempts never double-book; ID verifier works on a guard's phone.

### Phase 2: Collaboration (weeks 6 to 9)
- LiveKit call with tldraw whiteboard inside Meet.
- Communities with realtime chat, upvotes, helper tags (official year/subject/batch groups auto-created).
- Clubs with join requests, notices, club community, payment webhook.
- Events: college events, creation and approval, add to calendar.
- Lost and found full lifecycle.

### Phase 3: Intelligence and polish (weeks 10 to 12)
- Resource processing, flashcards with spaced repetition, doubt chat with citations.
- Friends and privacy controls.
- Performance pass, accessibility pass, load test (simulate 300 concurrent users), PWA install and push notifications.

### Backlog (from your notes, after the above)
Canteen and mess menu cards, LeetCode and Codeforces contest ranking, classroom booking, placement data, developer profile (GitHub links), attendance monitoring, anti-ragging reporting (can start inside complaints as a sensitive domain), seating arrangement, moments, external events feed.

## 9. Team split
Split by vertical slice and database ownership so merges rarely conflict. Foundation (Phase 0) is done together.

| Dev | Owns | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|---|
| A: Platform and identity | Shell, auth, profiles, ID and verifier, presence, calendar, notifications | 1, 2, 6, 7 | Events | Friends, PWA, push |
| B: Campus operations | Complaints, escalation jobs, Meet and booking, calls and whiteboard, lost and found | 3, 4 | Call and whiteboard, lost and found | Load testing, performance |
| C: Academic and social | Acad resources, flashcards and doubt chat, communities, clubs | 5 | Communities, clubs | Flashcards, doubt chat |

Working agreements:
- Each feature starts with a short spec (`features/<name>/README.md`) written first and reviewed by one other person.
- One branch per feature slice, small pull requests, one human reviewer on each.
- Database migrations are numbered; only one person merges migrations per day to avoid conflicts, or rebase and renumber before merge.
- Weekly 30-minute integration check: all features working together on the preview deployment.

## 10. Risks and decisions to settle early
| Risk | Mitigation |
|---|---|
| Browser location is spoofable, flaky indoors and cannot run in the background | Treat as soft signal with a confidence score; combine with the campus network check and QR; use the native app's OS geofencing for true background monitoring; require high confidence before anything affects attendance |
| Continuous location monitoring is sensitive personal data | Opt-in consent, pause and revoke, no coordinates stored, no tracking outside campus, role-scoped access, short retention, written college policy before launch |
| Getting official roster data (names, branches, divisions) | Ask college office early; fall back to self-service profile setup with teacher or admin verification |
| Who the complaint authorities are and their willingness to respond | Meet the administration before building the routing screens; get real chains and SLAs |
| AI cost and quality | Per-user limits, grounded answers with citations, "I don't know" fallback |
| Privacy and data protection (student data, location, anonymous complaints) | Collect the minimum, role-scoped access, audit log, clear privacy page; get college approval |
| Scope creep from the long notes list | Everything outside the phases goes to the backlog; add only when a phase finishes early |
| Agent drift and inconsistent code | `AGENTS.md` rules, feature READMEs, tests, small tasks |
| Free tier limits (Supabase, LiveKit, Gemini) | Monitor usage, keep an eye on pausing rules for inactive projects, budget a small paid tier for the demo period |

## 11. Open questions for the team
1. Name and logo (blocks Phase 0 branding).
2. Does the college have an existing student database or ERP we can import from?
3. Is the campus single-site? Need the boundary coordinates.
4. Is there budget for a paid tier or a payment gateway account for clubs?
5. Who in the administration will sponsor the complaint routing so authorities actually use it?
6. Does every student and teacher have a working college email, and who manages those mailboxes (can the college tell us how email is hosted)?
7. Which email service will send the one-time codes in production (a transactional service like Resend or Brevo, or the college's own mail server), and who owns the sender domain settings?
8. What is the teachers' employee or staff ID (needed for the roster and the ID card, not for sign-in)?
9. Who in the administration approves external organizers and their events?
