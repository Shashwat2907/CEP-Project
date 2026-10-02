# Outbox Events Registry

All allowed `type` values in `events_outbox`.
These are the domain events emitted by features; Edge Functions consume them.

Format: `<feature>.<past-tense-verb>` — lowercase, dot-separated.

| Type | Payload | Consumer | Notes |
|---|---|---|---|
| `session.accepted` | `{ sessionId, studentId, teacherId, startsAt, endsAt, mode }` | notify + calendar | Creates calendar entries and notifications for both |
| `session.cancelled` | `{ sessionId, cancelledBy, reason }` | notify + calendar | Removes calendar entries, sends notification |
| `complaint.escalated` | `{ complaintId, fromLevel, toLevel, newAssigneeId }` | notify | Notifies new assignee and student |
| `complaint.resolved` | `{ complaintId, resolvedById, note }` | notify | Notifies student |
| `lostfound.matched` | `{ itemId, lostReporterId, foundReporterId }` | notify | Notifies both parties |
| `event.published` | `{ eventId, title, startsAt, targetAudience }` | notify | Notifies relevant users |
