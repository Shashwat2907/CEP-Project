# Feature: Clubs (`clubs`)

**Owner:** Kedar  
**Area:** `src/features/clubs/`, routes under `src/app/(student)/clubs/` and `src/app/(teacher)/clubs/`  
**Tables owned:** `clubs`, `club_members`, `club_notices`  
**Depends on (must be merged first):** `feat/community-core` (every club has its own community room), `feat/auth-and-roles`

---

## 1. Purpose

A directory of college clubs. Each club has a page with a description, notices, events, and its own chat room (a community). Students can join free clubs or paid clubs. **Paid club membership activates only after a verified server-side payment webhook** — never from a client redirect.

---

## 2. Club Page Contents

Every club page must show:

| Section | Description |
|---|---|
| Header | Club name, cover image, tagline, join/leave button |
| About | Description (markdown, rendered) of what the club offers |
| Notices | Pinned announcements from the club lead, newest first |
| Events | Upcoming and past events organised by this club (reads from `events` table via `events_outbox`; Shashwat owns Events) |
| Community room | Link to / embed of the club's dedicated community chat (reuses the shared chat component from `src/shared/chat`) |
| Members count | Total member count (not the full list, for privacy; full list visible to club lead and admin only) |
| Fee | Displayed prominently if the club has a joining fee; "Free to join" otherwise |

---

## 3. Club Fields

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | text | Unique |
| `description` | text | Markdown |
| `tagline` | text | Short (max 120 chars) |
| `cover_image_path` | text | Nullable; Supabase Storage signed URL |
| `fee` | numeric(10,2) | 0 for free clubs |
| `currency` | text | Default `INR` |
| `lead_id` | uuid FK → profiles | The club lead (teacher or senior student) |
| `community_id` | uuid FK → communities | Created alongside the club |
| `active` | boolean | Inactive clubs are hidden from the directory |
| `created_at` | timestamptz | UTC |

### club_members

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `club_id` | uuid FK → clubs | |
| `user_id` | uuid FK → profiles | |
| `status` | enum | `requested`, `payment_pending`, `member`, `rejected` |
| `payment_ref` | text | Nullable; payment provider order/payment ID |
| `payment_verified_at` | timestamptz | Nullable; set by the webhook handler |
| `joined_at` | timestamptz | Nullable; set when `status` becomes `member` |
| `created_at` | timestamptz | UTC |
| UNIQUE | (club_id, user_id) | One row per student per club |

### club_notices

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `club_id` | uuid FK → clubs | |
| `author_id` | uuid FK → profiles | Must be the club lead |
| `body` | text | Markdown |
| `pinned` | boolean | Default false |
| `created_at` | timestamptz | UTC |

---

## 4. Join Flow

### Free Club

```
Student clicks "Join"
        │
        ▼
club_members row inserted with status = 'requested'
        │
Club lead reviews join requests in their dashboard
       / \
  Approved  Rejected
      │          │
status='member'  status='rejected'
      │
notify(student, 'clubs.join_approved')
```

- The club lead sees a list of pending requests in their club dashboard.
- Lead can approve all or reject with an optional reason.
- On approval, the student is also added as a `member` to the club's community (`community_members`).

### Paid Club

```
Student clicks "Join" (fee shown)
        │
        ▼
club_members row inserted with status = 'requested'
        │
        ▼
Server creates a payment order via payment provider API (Razorpay)
        │
        ▼
Client redirects to payment page (status = 'payment_pending')
        │
User completes or abandons payment
        │
        ▼ (webhook from payment provider, server-side only)
Payment verified?
   YES → status = 'member', payment_verified_at = now()
         notify(student, 'clubs.payment_confirmed')
         add to community_members
   NO  → status = 'requested' (or a new 'payment_failed' state)
         notify(student, 'clubs.payment_failed')
```

> **CRITICAL (from AGENTS.md §6 and CONTRACT.md §10):**  
> Membership is activated **only** from the verified server-side webhook. The client redirect back from the payment page must NEVER activate membership. A student who manipulates the redirect URL must not become a member.

- Payment provider: **Razorpay** (the payment gateway used by the college — confirm before implementation; this is a SEED VALUE decision).
- Webhook endpoint: `src/app/api/webhooks/razorpay/route.ts` (owned by Kedar for club payments).
- Webhook must verify the Razorpay signature before processing.

### Leaving a Club
- A member can leave a free club at any time (status removed).
- A member who paid cannot get an automatic refund through the app — they must contact the club lead. Refund handling is manual for MVP.
- On leave, remove from `club_members` and from the club's `community_members`.

---

## 5. Status Chips (displayed on the club page and "My Clubs")

| Status | Chip label | Color token |
|---|---|---|
| `requested` | "Request pending" | `warning` |
| `payment_pending` | "Payment pending" | `warning` |
| `member` | "Member" | `success` |
| `rejected` | "Not accepted" | `error` |

Colors must use tokens from `DESIGN.md`. No hardcoded hex values.

---

## 6. Clubs Directory Page

- Grid of club cards: cover image, name, tagline, fee (or "Free"), member count
- Filters: all / joined / not joined / free / paid
- Search by name or tagline
- "My Clubs" section at the top (clubs where `status = 'member'`)
- Loading, empty and error states required

---

## 7. Club Lead Dashboard

Route: `/clubs/[clubId]/manage` (only accessible to the club lead and admin)

| Tab | Contents |
|---|---|
| Join requests | List of `requested` and `payment_pending` members; approve/reject actions |
| Members | Full member list with join date; remove member action |
| Notices | Create, pin, delete notices |
| Settings | Edit club description, cover image, tagline; deactivate club |

---

## 8. Permissions (RLS summary)

| Actor | Read clubs | Read members | Join | Approve joins | Post notices | Delete club |
|---|---|---|---|---|---|---|
| Student | ✅ (active clubs) | ❌ (count only) | ✅ | ❌ | ❌ | ❌ |
| Club member | ✅ | ❌ | — | ❌ | ❌ | ❌ |
| Club lead | ✅ | ✅ (own club) | — | ✅ (own club) | ✅ (own club) | ❌ |
| Admin | ✅ | ✅ | — | ✅ | ✅ | ✅ |

---

## 9. Community Room Creation

When a new club is created (by admin or a designated teacher):
1. A `communities` row is created with `kind = 'unofficial'`, `name = <club name> + " — Club"`, `official = true`.
2. The club lead is added as `moderator` in `community_members`.
3. All existing club members are added as `member` in `community_members`.
4. The `clubs.community_id` is set to this new community.

This runs as a single database transaction to avoid orphaned records.

---

## 10. Edge Cases

- Student tries to join a club they already have a `requested` row for: return a clear "You already have a pending request" message; don't create a duplicate row (UNIQUE constraint on `club_id, user_id`).
- Payment webhook arrives twice for the same order (Razorpay can retry): the handler must be **idempotent** — check `payment_ref` before updating, skip if already processed.
- Club lead is changed (admin action): update `clubs.lead_id` and update `community_members` role for the old and new lead.
- Inactive club (`active = false`): hidden from the directory; existing members can still see it under "My Clubs" with an "Inactive" badge.
- Club is deleted: cascade-delete `club_members`, `club_notices`; archive (not delete) the community room.
- Student's account is deactivated via roster `inactive`: remove them from `club_members` and the club's community.

---

## 11. Notifications

| Event | Who gets notified | Type string |
|---|---|---|
| Join request received | Club lead | `clubs.join_requested` |
| Join approved (free club) | Requester | `clubs.join_approved` |
| Join rejected | Requester | `clubs.join_rejected` |
| Payment confirmed (paid club) | Member | `clubs.payment_confirmed` |
| Payment failed | Student | `clubs.payment_failed` |
| New notice posted | All members | `clubs.notice_posted` |

Add all of the above to `docs/contracts/notification-types.md` in the same PR as the feature.

---

## 12. Calendar

When a club event is created (via the Events feature, owned by Shashwat):
- `addCalendarEntry()` is called with `sourceType = 'club_event'`.
- This appears in every club member's calendar with the correct color token from `DESIGN.md`.
- Cancellation calls `removeCalendarEntry({ sourceType: 'club_event', sourceId: eventId })`.

Add `club_event` to `docs/contracts/calendar-sources.md` in the Events PR (Shashwat's responsibility; Kedar requests it).

---

## 13. Definition of Done (per slice)

Per `AGENTS.md` §4:
- [ ] Spec (this file) is up to date
- [ ] Migration applied locally; RLS tested with allowed and denied cases
- [ ] Zod schema shared by client and server
- [ ] UI matches `DESIGN.md` tokens; works on mobile and in dark mode
- [ ] Loading, empty and error states on directory, club page, and dashboard
- [ ] Unit tests: payment webhook idempotency, join flow state machine, free vs. paid paths
- [ ] One Playwright test: student joins a free club end-to-end
- [ ] Webhook endpoint verified with a Razorpay test event
- [ ] Notifications created for join and payment events
- [ ] No console errors, typecheck and lint clean

---

## 14. Open Questions

1. **Is Razorpay the correct payment provider?** Does the college or team already have a Razorpay account? (Needed before `feat/clubs-join-and-payments` can start)
2. Who creates clubs — only admins, or can any teacher apply to start one?
3. Is there a cap on the number of clubs a student can join?
4. Should there be a "Club application" flow where a group of students proposes a new club to an admin? (Currently assumed admin-only creation)
5. What is the refund policy for paid clubs — is out-of-app refund handling acceptable for the pilot?
