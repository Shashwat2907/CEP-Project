# Feature: Meet (Book a Session with Teacher)

Owner: Kushal  
Branch: `feat/meet-availability` → `feat/meet-booking` → `feat/meet-online-call` → `feat/meet-whiteboard`  
Depends on: `feat/notifications-and-calendar-core` (needs `notify()` and `addCalendarEntry()` from shared)

---

## Purpose

Allow students to book a one-on-one session with a teacher.  
Teachers set when they are free. Students see open slots, pick one, and give a reason.  
Teacher accepts or declines. If accepted, both get a calendar entry and reminders.  
Session can be offline (teacher's room) or online (video call).

---

## How Teacher Sets Availability

Teachers define their free time in two ways. Both are stored in the database.

### 1. Weekly Recurring Rules (`availability_rules` table)
These repeat automatically every week.

| Field | Example |
|---|---|
| Weekday | Monday, Wednesday, Friday |
| Start time | 2:00 PM |
| End time | 4:00 PM |
| Slot duration | 30 minutes |

Example result: "Every Monday 2–4 PM = 4 bookable slots of 30 min each"

### 2. One-off Date Exceptions (`availability_exceptions` table)
Override weekly rules for a specific date.

| Kind | Meaning | Example |
|---|---|---|
| `blocked` | Teacher unavailable on that date/time | "Block all Monday 15 Oct — holiday" |
| `extra` | Teacher added slots on a non-regular date | "Add extra slots on 20 Oct, 10–11 AM" |

### How Open Slots Are Calculated
Slots are **not stored** in the database. They are generated on-the-fly when a student views a teacher:

1. Take teacher's weekly rules for the date range requested.
2. Remove any `blocked` exceptions.
3. Add any `extra` exceptions.
4. Remove slots already occupied by an `accepted` session request.
5. Return remaining slots as open and bookable.

Slots are cached briefly (a few seconds) to handle many students reading at the same time.

---

## Booking States

```
pending
    ↓               ↓
accepted          declined        ← teacher decides (with optional note)
    ↓
offline_selected  OR  online_selected   ← student picks mode after acceptance
    ↓
completed         OR  cancelled
```

Special state:
```
expired   ← teacher did not respond within 48 hours, request auto-expires
```

---

## Full Step-by-Step Flow

**Step 1 — Student requests a slot:**
- Student browses a teacher's profile and sees the open slot grid.
- Clicks a slot and writes a reason (required, minimum 20 characters).
- Submits the request.
- Teacher receives notification: `meet.requested`.

**Step 2 — Teacher responds:**
- Teacher sees the request in their dashboard with the student's reason.
- Clicks **Accept** or **Decline** (optional reason for decline).
- If accepted → student gets notification `meet.accepted`.
- If declined → student gets notification `meet.declined`.
- If teacher does not respond in 48 hours → request auto-expires, student gets notification `meet.expired`.

**Step 3 — Student picks mode (only after acceptance):**
- Student sees: "Session confirmed. How do you want to meet?"
  - **Offline** → teacher's room / office location is shown.
  - **Online** → a video call room is prepared (Phase 1: simple link, Phase 2: LiveKit).
- Calendar entry is created for both student and teacher via `addCalendarEntry()`.

**Step 4 — Reminders:**
- Background job sends reminder notification 30 minutes before the session starts.
- Type: `meet.reminder` → sent to both student and teacher.

**Step 5 — Session ends:**
- Status updates to `completed` or `cancelled`.
- If cancelled → `removeCalendarEntry()` is called for both.

---

## Double Booking Prevention (Critical)

Two students must never be able to book the same teacher for the same time slot.

**How it works:**
- The `session_requests` table has a **database-level exclusion constraint**.
- No two rows with status `accepted` can have overlapping time ranges for the same `teacher_id`.
- This is enforced at the database, not just in the UI.
- If two students click the same slot at the exact same moment:
  - One request goes through successfully.
  - The other hits the constraint and fails immediately.
  - The second student sees: *"This slot was just taken. Please choose another."*
- Verified with a Vitest test that fires two simultaneous requests for the same slot.

---

## Cancellation Rules

| Who | When | Consequence |
|---|---|---|
| Student | Any time before session starts | Status → `cancelled`, other party notified |
| Teacher | Any time before session starts | Status → `cancelled`, other party notified |
| Either | Within 1 hour of start time | Notification marked "last-minute cancellation" so both sides are aware |
| Student | More than 3 cancellations in a day | Rate limited — cannot cancel again until next day |

Cancellation always calls `removeCalendarEntry()` for both participants.

---

## Offline vs Online Sessions

**Offline:**
- Teacher's room number / office / cabin location is stored in their profile.
- Shown to student after they select offline mode.
- No video room is created.

**Online — Phase 1 (simple link):**
- A room link (Jitsi embed or similar) is generated on the server when teacher accepts.
- Both student and teacher join from `/meet/[sessionId]`.
- Page is accessible only to the two participants, only within the session time window.

**Online — Phase 2 (LiveKit — `feat/meet-online-call`):**
- LiveKit WebRTC room created server-side on acceptance.
- Full call UI: camera, mic toggle, leave button.
- Only the two participants can join, within the session window.

**Whiteboard — Phase 2 (`feat/meet-whiteboard`):**
- tldraw collaborative whiteboard on the same session page.
- Both participants can draw in real time.
- Snapshot saved automatically at session end.
- Both can view the saved whiteboard from the session history page.

---

## User Stories

**Teacher:**
- I can set my weekly available hours with a specific slot duration (e.g., 30 min slots).
- I can block specific dates or add extra slots for unusual days.
- I can see all pending requests with each student's reason.
- I can accept or decline with an optional note.
- After accepting, the session appears automatically in my calendar.
- I get a reminder 30 minutes before the session.

**Student:**
- I can browse a teacher's profile and see their open slots.
- I can request a slot by writing a reason.
- I get notified when the teacher accepts or declines.
- After acceptance I choose offline or online.
- The session appears automatically in my calendar.
- I get a reminder 30 minutes before.
- If online, I can join the call directly from the app.

---

## Permissions (RLS rules)

| Who | Can read | Can write |
|---|---|---|
| Student | Own session requests + teacher's public open slots | Submit request, pick mode, cancel own request |
| Teacher | Own availability rules + all requests sent to them | Accept/decline, set slots, add exceptions, cancel |
| Admin | Everything | Everything |
| Logged-out user | Nothing | Nothing |

---

## Edge Cases

| Case | How it is handled |
|---|---|
| Two students click same slot simultaneously | DB exclusion constraint fires — one succeeds, other gets clear "slot just taken" message |
| Teacher blocks availability after a pending request exists | Request stays pending. Teacher must still respond to it. |
| Teacher does not respond in 48 hours | Request auto-expires. Student notified. Slot opens back up. |
| Student cancels more than 3 times in a day | Rate limited until next day. Error message explains the limit. |
| Student picks online but goes offline before session | Session page shows "waiting for participant" state. No auto-cancel. |
| Session time passes without either party joining | Status moves to `completed` after session window ends (no penalty, just archive). |

---

## Notifications (uses `notify()` from shared)

Per `docs/contracts/notification-types.md`:

| Event | Type | Sent to |
|---|---|---|
| Student requests a slot | `meet.requested` | Teacher |
| Teacher accepts | `meet.accepted` | Student |
| Teacher declines | `meet.declined` | Student |
| Request auto-expires (48h no response) | `meet.expired` | Student |
| Session cancelled | `meet.cancelled` | Other party |
| 30-min reminder | `meet.reminder` | Both |

---

## Calendar Entries (uses `addCalendarEntry()` from shared)

Per `docs/contracts/calendar-sources.md`, source type: `meet`

- Created for both student and teacher when student picks offline/online mode.
- Removed for both when status → `cancelled`.

---

## Database Tables This Feature Owns

```sql
availability_rules      -- id, teacher_id, weekday, start_time, end_time, slot_minutes, created_at
availability_exceptions -- id, teacher_id, date, start_time, end_time, kind (blocked/extra), created_at
session_requests        -- id, student_id, teacher_id, starts_at, ends_at, reason, status,
                        --   mode (offline/online), location, room_id, created_at
                        -- EXCLUDE: no two accepted rows overlap per teacher_id
```

All tables have: `created_at`, RLS enabled, explicit policies, foreign keys with `ON DELETE` rules.

---

## Files This Feature Will Create

```
src/features/meet/
├── README.md                        ← this file
├── schema.ts                        ← Zod validation schemas
├── queries.ts                       ← read availability, open slots, session requests
├── actions.ts                       ← submit request, accept/decline, pick mode, cancel
└── components/
    ├── TeacherAvailabilityForm.tsx   ← set weekly slots and exceptions
    ├── SlotGrid.tsx                  ← display open slots for a teacher
    ├── RequestForm.tsx               ← student submits request with reason
    ├── MyRequestsList.tsx            ← student's own requests with status
    ├── TeacherRequestQueue.tsx       ← teacher's pending requests dashboard
    └── SessionPage.tsx               ← session join page (video call in Phase 2)
```

Migration files:
- `supabase/migrations/<timestamp>_kushal_meet_availability.sql`
- `supabase/migrations/<timestamp>_kushal_meet_booking.sql`

---

## What Is NOT in This Slice

| Feature | Branch |
|---|---|
| LiveKit video call UI | `feat/meet-online-call` |
| tldraw whiteboard with sync and snapshot | `feat/meet-whiteboard` |
| Group sessions or office hours queue | Backlog — not planned |
