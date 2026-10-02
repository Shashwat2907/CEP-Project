# Feature: Communities (`community`)

**Owner:** Kedar  
**Area:** `src/features/community/`, routes under `src/app/(student)/community/` and `src/app/(teacher)/community/`  
**Shared:** `src/shared/chat` (Kedar owns this; used by events and clubs too)  
**Tables owned:** `communities`, `community_members`, `messages`, `message_votes`, `community_tags`  
**Depends on (must be merged first):** `feat/profile-and-roster-import` (for auto-creation from roster), `feat/auth-and-roles`, `feat/notifications-and-calendar-core`

---

## 1. Purpose

Communities are persistent chat rooms tied to academic groups and student interests. The key design decision: **official communities are auto-created from the roster** so every student is already in the right rooms (year, subject, batch) on day one. Students can also create unofficial communities for any shared interest.

---

## 2. Community Kinds

### Official Communities (auto-created, teacher-moderated)
Created automatically when the roster is imported or updated. Students cannot delete these.

| Kind | Example name | Auto-created from |
|---|---|---|
| `year_branch` | "SE Computer" | year + branch from roster |
| `subject` | "Data Structures — SE CS" | subject + year + branch |
| `batch` | "SE CS Batch A" | year + branch + batch from roster |

- Teachers of that subject/year/branch are automatically moderators.
- Students are automatically added as members when their roster entry is matched.
- When the roster marks a student `inactive`, they are removed from all official communities.

### Unofficial Communities (student-created, student-moderated)
- Created by any student with a name, description and optional cover image.
- The creator becomes the first moderator.
- Discoverable via community list (unless set to private — see §6).
- Any student can request to join; the moderator approves or rejects.

---

## 3. Community Fields

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `kind` | enum | `year_branch`, `subject`, `batch`, `unofficial` |
| `name` | text | |
| `description` | text | Nullable |
| `official` | boolean | True for auto-created groups |
| `year` | smallint | Nullable (null for unofficial) |
| `branch` | text | Nullable |
| `subject_id` | uuid FK → subjects | Nullable (only for subject-kind) |
| `batch` | text | Nullable |
| `private` | boolean | Default false; unofficial communities can be private |
| `created_at` | timestamptz | UTC |

### community_members

| Field | Type | Notes |
|---|---|---|
| `community_id` | uuid FK | |
| `user_id` | uuid FK → profiles | |
| `role` | enum | `member`, `moderator` |
| `joined_at` | timestamptz | |

---

## 4. Channels

For MVP, **each community has a single default channel** ("General"). Multi-channel support (like announcements, resources, off-topic) is deferred to the backlog. The data model (`community_id` on messages) already supports multiple channels if added later; just add a `channel_id` column in a new migration.

---

## 5. Chat and Messages (belongs to `feat/community-chat`)

**This is the shared chat component** — built by Kedar and exported via `src/shared/chat` so Events and Clubs can reuse it.

### message fields

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `community_id` | uuid FK → communities | |
| `author_id` | uuid FK → profiles | |
| `parent_id` | uuid FK → messages | Nullable; for thread replies |
| `body` | text | Max 2000 chars |
| `attachment_path` | text | Nullable; Supabase Storage path |
| `created_at` | timestamptz | UTC |
| `edited_at` | timestamptz | Nullable |
| `deleted_at` | timestamptz | Soft delete; body replaced with "Message deleted" |

### message_votes

| Field | Type | Notes |
|---|---|---|
| `message_id` | uuid FK | |
| `user_id` | uuid FK | |
| PRIMARY KEY | (message_id, user_id) | One vote per user per message |

### Chat features (must-have for MVP)
- Realtime via Supabase Realtime (Postgres changes on `messages`)
- Replies (thread on a message via `parent_id`)
- Upvotes on replies (not on top-level messages — upvotes feed the tag system)
- Reactions (emoji; stored as a JSONB column `reactions` on `messages`)
- Unread count per community per user (tracked via `last_read_at` in `community_members`)
- Attachment: single image or file per message (signed URL, same storage rules as resources)
- Edit own message (within 5 minutes of posting — configurable, stored in config table)
- Soft delete own message; moderator can hard-delete

### Rate limiting
- Max 10 messages per minute per user per community (configurable in config table)
- Exceeding limit: return a user-readable error, not a 500

---

## 6. Tag System (belongs to `feat/community-tags`)

Community-specific recognition tags, awarded automatically by a database trigger when a user's upvote count on replies crosses configurable thresholds.

### community_tags

| Field | Type | Notes |
|---|---|---|
| `community_id` | uuid FK | |
| `user_id` | uuid FK | |
| `tag` | text | e.g. `helper`, `doubt_solver`, `top_contributor` |
| `awarded_at` | timestamptz | |
| PRIMARY KEY | (community_id, user_id, tag) | |

### Tag thresholds (SEED VALUES — confirm with team)

| Tag | Trigger condition |
|---|---|
| `helper` | 10 upvoted replies in the community |
| `doubt_solver` | 25 upvoted replies in the community |
| `top_contributor` | 50 upvoted replies in the community |

> Label these in `seed.sql` as: `-- SEED VALUE: confirm tag thresholds with team`

- Tags are shown next to the user's name in chat and on their profile (within that community).
- Tags are per-community: being a "Helper" in DS community does not make you one in Maths.
- A trigger on `message_votes` recalculates and awards tags. **Trigger must be idempotent** — inserting a duplicate tag row is a no-op (ON CONFLICT DO NOTHING).

---

## 7. Discovery and List

- Community list page: shows "My communities" first, then "Discover" section below
- Discover section: all public communities; search by name; filter by kind (year/subject/unofficial)
- Private unofficial communities: not shown in discovery; join only via invite link (Phase 2 backlog)
- Official communities are non-joinable manually — membership is managed by the roster

---

## 8. Moderation

| Action | Who can do it |
|---|---|
| Mute a member (prevent posting for a duration) | Moderator, Admin |
| Remove a member | Moderator, Admin |
| Delete any message | Moderator, Admin |
| Report a message | Any member |
| Pin a message | Moderator |
| Archive a community | Admin only |

- Reports go into an admin review queue (a simple `message_reports` table — add in the migration)
- A reported user who gets 3 confirmed reports within 7 days is auto-muted for 24 hours (configurable). **This is a SEED VALUE — confirm with team.**

---

## 9. Permissions (RLS summary)

| Actor | Read messages | Post messages | Moderate |
|---|---|---|---|
| Non-member | ❌ (private); ✅ (public, read-only for preview) | ❌ | ❌ |
| Member | ✅ | ✅ | ❌ |
| Moderator | ✅ | ✅ | ✅ (own community) |
| Teacher (official community they teach) | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ |

---

## 10. Edge Cases

- Student joins a subject community for a subject they are not enrolled in: allowed for unofficial; blocked for official (RLS checks roster).
- Roster update removes a student from a batch: they are also removed from the corresponding official community members row.
- Community name conflict: two unofficial communities with the same name are allowed (use IDs, not names, as identifiers).
- Empty community (all members left): keep the row, show as empty; moderator can archive it.
- Message with only whitespace: reject server-side with a Zod refinement.
- Attachment upload fails mid-message: show error and let the user retry without losing the typed text.

---

## 11. Notifications

| Event | Who gets notified | Type string |
|---|---|---|
| Added to an official community | the new member | `community.added` |
| Approved to join unofficial community | the requester | `community.join_approved` |
| Rejected from unofficial community | the requester | `community.join_rejected` |
| Tag awarded | the tagged user | `community.tag_awarded` |
| Message reported (for review) | admins/moderators | `community.message_reported` |

Add all of the above to `docs/contracts/notification-types.md` in the same PR.

---

## 12. Auto-creation Logic (on roster import)

When `feat/profile-and-roster-import` triggers a roster import:
1. For each unique `(year, branch)` pair → upsert one `year_branch` community.
2. For each unique `(subject_id, year, branch)` → upsert one `subject` community.
3. For each unique `(year, branch, batch)` → upsert one `batch` community.
4. For each active student → insert into `community_members` for their `year_branch`, all their subjects, and their `batch`. ON CONFLICT DO NOTHING.
5. For each teacher → insert into `community_members` as `moderator` for subjects they teach.

This runs as a database function called from the server action after a successful roster import. It must be **idempotent** — re-importing the same roster makes no duplicate communities or members.

---

## 13. Definition of Done (per slice)

Per `AGENTS.md` §4:
- [ ] Spec (this file) is up to date
- [ ] Migration applied locally; RLS tested with allowed and denied cases
- [ ] Zod schema shared by client and server
- [ ] UI matches `DESIGN.md` tokens; works on mobile and in dark mode
- [ ] Loading, empty and error states on all list and chat views
- [ ] Unit tests for tag trigger (idempotent), rate limit, moderation actions
- [ ] One Playwright test: send a message, upvote a reply, tag is awarded
- [ ] Notifications created for join approval/rejection and tag award
- [ ] No console errors, typecheck and lint clean

---

## 14. Open Questions

1. What are the actual subject enrolments per student? Is that in the roster CSV, or in a separate ERP table?
2. Should teachers be auto-added as moderators to `year_branch` and `batch` communities for their year/branch, or only to subject communities?
3. What is the retention policy for chat messages? (e.g. delete after academic year?)
4. Do we need DMs (direct messages) between friends? — currently scoped to communities only; DMs are in the backlog.
