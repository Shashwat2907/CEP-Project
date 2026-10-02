# Notification Types Registry

All allowed `type` values for the `notify()` helper.
Format: `<feature>.<past-tense-verb>` — lowercase, dot-separated.

Adding a value: include it in your feature's pull request and add a row here in the same PR.
Changing or removing a value: contract change — all three must approve (CONTRACT.md §5.6).

| Type | Sent by | Payload fields | Link target |
|---|---|---|---|
| `auth.code_sent` | auth | `email` | `/sign-in` |
| `meet.requested` | meet | `sessionId`, `studentName`, `slotTime` | `/meet/[sessionId]` |
| `meet.accepted` | meet | `sessionId`, `teacherName`, `slotTime`, `mode` | `/meet/[sessionId]` |
| `meet.declined` | meet | `sessionId`, `teacherName`, `reason` | `/meet` |
| `meet.cancelled` | meet | `sessionId`, `cancelledBy`, `slotTime` | `/meet` |
| `meet.reminder` | meet (job) | `sessionId`, `slotTime`, `mode` | `/meet/[sessionId]` |
| `complaint.raised` | complaints | `complaintId`, `domain`, `title` | `/complaints/[complaintId]` |
| `complaint.escalated` | complaints (job) | `complaintId`, `fromLevel`, `toLevel`, `domain` | `/complaints/[complaintId]` |
| `complaint.resolved` | complaints | `complaintId`, `resolvedBy`, `note` | `/complaints/[complaintId]` |
| `complaint.reopened` | complaints | `complaintId`, `reopenedBy` | `/complaints/[complaintId]` |
| `lostfound.matched` | lostfound | `itemId`, `matchKind` | `/lost-found/[itemId]` |
| `lostfound.claim_reviewed` | lostfound | `itemId`, `claimId`, `status` | `/lost-found/[itemId]` |
| `lostfound.ready_for_pickup` | lostfound | `itemId`, `dropOffPoint` | `/lost-found/[itemId]` |
| `events.published` | events | `eventId`, `title`, `startsAt` | `/events/[eventId]` |
| `events.rsvp_confirmed` | events | `eventId`, `title` | `/events/[eventId]` |
| `id.revoked` | identity | `userId` | `/id` |
