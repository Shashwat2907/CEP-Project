# Feature: Complaints

Owner: Kushal  
Branch: `feat/complaints-core` → `feat/complaints-escalation` → `feat/complaints-tracker-and-upvotes`  
Depends on: `feat/notifications-and-calendar-core` (needs `notify()` from shared)

---

## Purpose

Allow students to raise grievances against college departments and track their resolution.
Authorities at each level get assigned complaints and must resolve them within an SLA (time limit).
If they do not resolve in time, the system automatically escalates to the next responsible person.
Escalation is domain-specific — not every complaint goes to Principal.

---

## Important Rules

- Escalation is **domain-specific**. Each category has its own authority chain.
- A complaint moves to the next level only when the SLA hours expire without resolution.
- Principal or Director is included only when the issue actually falls under their authority.
- If the **final authority also does not resolve within their SLA**, the complaint is flagged as **"Needs Admin Attention"** and the admin gets an in-app notification. It does NOT auto-close.
- Students can file **anonymously** — author name is hidden from all handlers but stored in the database for abuse control only.
- **Harassment & Ragging complaints are always private** — never shown on the public tracker.

> ⚠️ All authority names and SLA values below are proposed. Must be confirmed with college administration before going live. They are stored as seed data in `supabase/seed.sql` clearly labelled `-- SEED VALUE: confirm with admin`.

---

## Complaint Domains & Routing Chains

Domains are stored in `complaint_domains` table. Authority chains are stored in `domain_assignees` table. Nothing is hardcoded.

### SLA per level

| Level | Time given to resolve |
|---|---|
| Level 1 | 24 hours |
| Level 2 | 48 hours |
| Level 3 | 72 hours |
| Final stop unresolved | Flagged → "Needs Admin Attention" → admin notified |

---

### Full Routing Table

| Category / Domain | Example Issue | Level 1 (24h) | Level 2 (48h) | Level 3 (72h) | Final Stop / Rule |
|---|---|---|---|---|---|
| **Academic – Subject** | Syllabus doubt, teaching-related issue | Subject Teacher | Class Coordinator / Academic Coordinator | HOD | Relevant academic authority |
| **Academic – Class** | Timetable clash, class-level scheduling | CR | Class Coordinator → Academic Coordinator | Academic authority if decision required | — |
| **Academic – Department** | Department-level academic issue | Class Coordinator / Academic Coordinator | HOD | Dean Academics | — |
| **Lab / Practical** | Equipment issue, computer not working | Lab Assistant | Lab Teacher → Technical/Dept authority | HOD | Relevant lab/technical authority |
| **Lab – Teaching** | Lab practical teaching or academic guidance | Lab Teacher | Class Coordinator / Academic Coordinator if academically relevant | Relevant academic authority | — |
| **Administrative – Scholarship** | Scholarship application, status, payment | Management Team / Scholarship authority | Next designated scholarship/admin authority | — | ⚠️ Do NOT auto-route to Principal. Confirm final authority with admin. |
| **Administrative – ID Card** | New ID card, lost/damaged card, correction | Management Team / ID-card authority | Next designated identity/system authority | — | ⚠️ Do NOT auto-route to Principal. Confirm final authority with admin. |
| **Administrative – General** | Certificate, document, admin request | Management Team | Relevant designated administrative authority | — | Authority that owns the process |
| **Class Management** | Classroom discipline, arrangement, routine | CR | Class Coordinator → HOD if dept-level decision required | — | Relevant class/department authority |
| **Hostel – Cleanliness / Maintenance** | Dirty room, broken furniture, water issue | Cleaning Staff / Hostel Caretaker | Warden | Management Team / Designated hostel authority | Stop at responsible hostel/management authority |
| **Hostel – Rules / Conduct** | Hostel rule violation, student conduct issue | Hostel Caretaker | Warden | Chief Warden / Management Team | Stop at responsible management authority |
| **Mess / Food** | Food quality, hygiene, service issue | Mess In-charge | Warden → Management Team if required | Management/contract authority | — |
| **Placement / Training** | Placement registration, training process | Training & Placement Cell | Designated placement/academic authority | — | T&P/college authority responsible for the process |
| **Infrastructure** | Classroom furniture, electrical, campus facility | Relevant facility/maintenance person or Management Team | Designated maintenance/facility authority | — | Authority responsible for the facility |
| **Club / Student Activity** | Club membership, event, club activity issue | Club In-charge / Club Head | Designated student-activity authority / Management Team | — | Relevant club/activity authority |
| **Department / HOD** | Administrative or academic dept-level issue | Class Coordinator / Academic Coordinator | HOD | — | HOD unless another designated authority is required |
| **Serious / Policy / Institutional** | Complaint requiring institutional decision | Designated responsible authority | Management Team → Principal/Director only when their authority is actually required | — | Authority empowered to make the institutional decision |
| **Harassment & Ragging** | Any form of harassment or ragging | Anti-Ragging Committee | Principal / Director | — | 🔴 **SENSITIVE — private. Never on public tracker. Direct route only. No upvotes visible.** |
| **Other / Unclear** | Issue does not match a defined domain | Management Team / Designated complaint handler | Manual categorisation and re-assignment | — | Stop after correct responsible authority is identified |

---

## Complaint States

```
submitted
    ↓
in_progress       ← handler opens and begins working on the ticket
    ↓
escalated         ← pg_cron job auto-escalates when SLA breaches (idempotent)
    ↓
resolved          ← handler marks resolved with a resolution note
    ↓
reopened          ← student says the issue was not actually fixed (within 3 days of resolved)
    ↓
closed            ← student confirms resolution OR 3 days pass with no student action (auto-close)
```

Every state change writes a row to the `complaint_events` table:
who did the action, when, from which level, to which level, and any notes.

---

## Anonymity Rules

- Student can toggle "File anonymously" on the submission form.
- If anonymous: the student's name and identity are **hidden from all authority handlers** at every level.
- The system still stores the real `author_id` internally in the `complaints` table for abuse control.
- Admins can see the real author only through the audit log, not through the complaint UI.
- Applies to all domains. For Harassment & Ragging, anonymity is always on — handlers never see author identity.

---

## Sensitive Domains

Domains flagged `sensitive = true` in `complaint_domains`:

| Domain | Rule |
|---|---|
| Harassment & Ragging | Never appears on public tracker. Not included in upvote count or tracker filters. Routes to Anti-Ragging Committee directly. |

---

## Duplicate Detection & Upvotes

- While typing a complaint title, the form runs a full-text search and shows similar open complaints.
- Student can upvote an existing complaint instead of filing a new one.
- One upvote per user per complaint (`UNIQUE(complaint_id, user_id)` constraint).
- Every 10 upvotes reduces the next SLA by 10% (capped at 50% reduction).
- Upvote count is public on the tracker for non-sensitive complaints.

---

## User Stories

**Student:**
- I can raise a complaint by picking a domain, describing the issue, attaching photos, and optionally filing anonymously.
- While typing, I see similar open complaints and can upvote one instead of filing again.
- I can see all my complaints with their current status and history.
- When my complaint is resolved, I get a notification and have a 3-day window to confirm or reopen.

**Authority / Handler:**
- I see only the complaints assigned to my level and domain — nothing else.
- I can mark a complaint as resolved with a resolution note.
- I get a notification when a new complaint is assigned to me.

**Admin:**
- I can see all complaints including sensitive ones.
- I manage domains, authority chains, and SLA values.
- I see the audit log for any complaint.
- I get flagged when a complaint reaches "Needs Admin Attention".

---

## Permissions (RLS rules)

| Who | Can read | Can write |
|---|---|---|
| Student | Own complaints + non-sensitive public complaints | Submit, upvote, confirm/reopen resolution |
| Authority | Complaints assigned to their level and domain only | Update status, add resolution note |
| Admin | Everything | Everything including domain management |
| Logged-out user | Nothing | Nothing |

---

## Edge Cases

| Case | How it is handled |
|---|---|
| Student files same complaint twice | Similar complaints shown while typing. Student can upvote instead of re-filing. |
| Handler marks resolved but student disagrees | Student clicks "Reopen". Complaint returns to active queue with student's note and higher priority. |
| No student action for 3 days after resolved | System auto-closes the complaint. |
| Complaint reaches final stop and still unresolved | Flagged "Needs Admin Attention". Admin notified. Stays open. |
| Escalation job runs twice in same interval | Idempotent — unique constraint on `complaint_events` for escalation type per level per complaint prevents double-escalation. |
| Sensitive domain complaint filed | Never appears in public tracker query. RLS policy blocks it from non-admin, non-committee users. |
| Anonymous complaint filed | `author_id` stored in DB but not returned by general queries. Handlers see "Anonymous Student". |

---

## Notifications (uses `notify()` from shared)

Per `docs/contracts/notification-types.md`:

| Event | Type | Sent to |
|---|---|---|
| Complaint submitted | `complaint.raised` | Assigned Level 1 handler |
| Complaint escalated | `complaint.escalated` | New handler + student |
| Complaint resolved | `complaint.resolved` | Student |
| Complaint reopened | `complaint.reopened` | Handler |

---

## Database Tables This Feature Owns

```sql
complaint_domains     -- id, name, parent_id, sensitive, routing_mode, visibility
domain_assignees      -- domain_id, level, sequence, role_id or user_id, sla_hours, escalation_condition
complaints            -- id, author_id, domain_id, subcategory_id, title, body, status,
                      --   current_level, anonymous, created_at, due_at, resolved_at
complaint_events      -- id, complaint_id, type, from_level, to_level, actor_id, note, at
complaint_attachments -- id, complaint_id, storage_path, created_at
complaint_upvotes     -- complaint_id, user_id  UNIQUE(complaint_id, user_id)
```

All tables have: `created_at`, RLS enabled, explicit policies, foreign keys with `ON DELETE` rules, indexes on filter columns.

---

## Files This Feature Will Create

```
src/features/complaints/
├── README.md                      ← this file
├── schema.ts                      ← Zod validation schemas
├── queries.ts                     ← read complaints, domains, assignees from DB
├── actions.ts                     ← submit, update status, confirm/reopen (server actions)
└── components/
    ├── RaiseComplaintForm.tsx      ← domain picker, description, attachments, anonymous toggle
    ├── MyComplaintsList.tsx        ← student's own complaints with status chips
    ├── AuthorityQueue.tsx          ← handler's assigned complaints dashboard
    ├── ComplaintDetail.tsx         ← full complaint view with timeline
    ├── ComplaintTimeline.tsx       ← vertical stepper of every event
    └── PublicTrackerBoard.tsx      ← college-wide tracker (non-sensitive only)
```

Migration: `supabase/migrations/<timestamp>_kushal_complaints_core.sql`

---

## What Is NOT in This Slice

| Feature | Branch |
|---|---|
| Automated escalation background job | `feat/complaints-escalation` |
| Public upvote board and duplicate suggestions | `feat/complaints-tracker-and-upvotes` |
| LiveKit call or whiteboard | Not Kushal's area |
