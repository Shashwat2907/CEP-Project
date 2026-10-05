# Feature: Academic Resources (`acad`)

**Owner:** Kedar  
**Area:** `src/features/acad/`, routes under `src/app/(student)/acad/` and `src/app/(teacher)/acad/`  
**Tables owned:** `subjects`, `resources`, `resource_chunks`, `flashcard_decks`, `flashcards`, `flashcard_reviews`, `ai_usage`  
**Depends on (must be merged first):** `feat/auth-and-roles`, `feat/notifications-and-calendar-core`

---

## 1. Purpose

A central portal for academic resources (notes, slides, past year questions). Teachers and students can upload files; student uploads need teacher approval to ensure quality. Approved resources are then processed into text chunks and embeddings to power the Flashcards and Doubt Chat AI features.

---

## 2. User Stories

### Student
- I want to browse resources filtered to my year and branch by default, so I don't have to search through irrelevant content.
- I can further filter by subject, resource type (notes, PYQ, slides), and search by title.
- I can download or view a resource using a signed URL.
- I can upload a resource; it stays `pending` until a teacher approves it.
- I can see the processing status of any resource (processing, ready, failed).
- I can generate a flashcard deck from any approved resource.
- I can use doubt chat grounded in a resource or subject.
- I have a daily limit on AI calls (flashcards + doubt chat combined).

### Teacher
- I can upload resources that go live immediately (approved status).
- I can see all pending student uploads for my subjects and approve or reject them with a reason.
- I can view all resources in my subjects.

### Admin
- I can see all resources across the college.
- I can delete any resource.

---

## 3. Resource Fields

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `title` | text | Required |
| `subject_id` | uuid FK → subjects | Required |
| `year` | smallint | 1–4 |
| `branch` | text | e.g. CS, IT, MECH |
| `type` | enum | `notes`, `pyq`, `slides`, `other` |
| `uploader_id` | uuid FK → profiles | Required |
| `storage_path` | text | Supabase Storage path |
| `status` | enum | `pending`, `approved`, `rejected` |
| `approved_by` | uuid FK → profiles | Nullable; set by teacher on approval |
| `rejection_reason` | text | Nullable; set by teacher on rejection |
| `created_at` | timestamptz | UTC |

### Subjects table

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | text | e.g. "Data Structures" |
| `code` | text | e.g. "CS301" |
| `year` | smallint | |
| `branch` | text | |
| `created_at` | timestamptz | |

> **SEED VALUE:** Subject list must come from the college office. Use placeholder subjects until received. Label seed rows with `-- SEED VALUE: confirm with college academic section`.

---

## 4. Approval Flow

```
Student uploads file
        │
        ▼
status = 'pending'  ← visible only to the uploader and teachers of that subject
        │
   Teacher reviews
       / \
approved  rejected (with reason)
   │
status = 'approved'
   │
Edge Function triggers → text extraction → chunking → embeddings in pgvector
(resource_chunks rows created; resource.processing_status updated)
```

- Teachers can only approve/reject resources for subjects they teach (enforced by RLS).
- The student who uploaded receives a `notify()` call on approval or rejection.
- Teacher uploads skip the pending step and go straight to `approved`.

---

## 5. Storage Rules

- Bucket: `resources` (private, no public access)
- Allowed file types: PDF, PPTX, DOCX (validated server-side on upload; reject others with a clear error)
- Max file size: 50 MB (configurable; stored in a config table, not hardcoded)
- Files are served only through **signed URLs** with a short expiry (e.g. 60 minutes)
- Storage path format: `resources/<year>/<branch>/<subject_id>/<resource_id>.<ext>`
- On rejection or deletion, the storage file is also deleted

---

## 6. Filters and Browse

- Default view (student): pre-filtered to the student's own `year` and `branch` from their profile
- Available filters: `year`, `branch`, `subject`, `type`, `saved` (bookmarks)
- Search: search on `title` and subject name with debounced interactive input
- Sorting: newest first (default), most downloaded (later)
- Bookmarks: students can save/unsave resources for instant access via the `saved_resources` table
- Detail view: `/acad/[id]` provides full resource metadata, AI status, and signed download link
- Every list view must have **loading, empty and error states**
- Mobile layout: single-column responsive card list


---

## 7. Permissions (RLS summary)

| Actor | Can read | Can insert | Can approve/reject | Can delete |
|---|---|---|---|---|
| Student | own pending + all approved | own pending uploads | ❌ | own pending only |
| Teacher | all (for their subjects) | any (auto-approved) | ✅ for their subjects | own uploads |
| Admin | all | any | ✅ | any |

> RLS must be tested with at least one allowed and one denied case per policy.

---

## 8. Processing Pipeline (belongs to `feat/acad-processing-pipeline`)

After a resource reaches `approved`:
1. A Supabase Edge Function (`embed-resource`) is triggered (via DB webhook or `events_outbox`).
2. Text is extracted from the PDF/PPTX/DOCX.
3. Text is split into overlapping chunks (~500 tokens, 50-token overlap).
4. Each chunk is embedded via Gemini Embeddings API.
5. Rows are inserted into `resource_chunks(id, resource_id, page, content, embedding vector)`.
6. `resource.processing_status` is updated: `processing` → `ready` (or `failed` with retry).
7. Per-user `ai_usage(user_id, day, calls)` is incremented on every AI call.

> **`ai_usage` daily limit** is a config value (not hardcoded). Label it: `-- SEED VALUE: confirm AI cost budget with team`.

---

## 9. Edge Cases

- Upload of a duplicate file (same name, same subject): allow — do not deduplicate silently, show a warning to the uploader.
- Processing fails: show a "Processing failed — retry" button on the resource card; admin can also trigger a retry.
- Approved resource later deleted: cascade-delete its `resource_chunks` and clean up storage.
- Teacher approves their own student's upload for a subject they don't teach: **blocked by RLS**.
- AI limit reached: return a clear, user-friendly message ("You've used your AI quota for today. Try again tomorrow.") — never a silent 500.
- Signed URL expired: clicking download re-generates the URL; do not show raw storage paths.

---

## 10. Notifications

| Event | Who gets notified | Type string |
|---|---|---|
| Student upload approved | uploader (student) | `acad.resource_approved` |
| Student upload rejected | uploader (student) | `acad.resource_rejected` |

These use `notify()` from `shared/`. Add `acad.resource_approved` and `acad.resource_rejected` to `docs/contracts/notification-types.md` in the same PR.

---

## 11. Definition of Done (per slice)

Per `AGENTS.md` §4:
- [ ] Spec (this file) is up to date
- [ ] Migration applied locally; RLS tested with allowed and denied cases
- [ ] Zod schema shared by client and server
- [ ] UI matches `DESIGN.md` tokens (no hardcoded colors, sizes or springs)
- [ ] Works at mobile width and in dark mode; loading, empty and error states done
- [ ] Unit tests for business rules; one Playwright test for the main flow
- [ ] Notifications created on approval/rejection
- [ ] No console errors, typecheck and lint clean

---

## 12. Open Questions

1. What subjects and subject codes exist per branch and year? (**needed from college office before `feat/community-core`**)
2. What is the maximum file size the college server can handle?
3. Who pays for Gemini API usage — is there a budget per month?
4. Should rejected resources be permanently deleted, or kept hidden for the uploader to edit and resubmit?
