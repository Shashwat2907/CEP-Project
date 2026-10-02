# Registry: Notification Types

Source of Truth: `documents/CONTRACT.md` §5.4

All notification `type` strings must follow the naming convention `<feature>.<past-tense-verb>` in lowercase.

| Type | Sent By | Description | Payload Fields | Link Target Pattern |
|---|---|---|---|---|
| `complaint.created` | Complaints | Dispatched to domain authorities when a new complaint is filed | `{ complaintId, domainId, title }` | `/complaints/[id]` |
| `complaint.escalated` | Complaints | Sent when a complaint exceeds SLA and moves to next level | `{ complaintId, level, previousLevel }` | `/complaints/[id]` |
| `complaint.resolved` | Complaints | Sent to student author when complaint is marked resolved | `{ complaintId, resolutionNote }` | `/complaints/[id]` |
| `meet.requested` | Meet | Sent to teacher when a student books or requests an office hour slot | `{ requestId, studentId, startsAt, reason }` | `/meet/requests/[id]` |
| `meet.accepted` | Meet | Sent to student when teacher accepts a session request | `{ requestId, teacherId, location, mode }` | `/meet/requests/[id]` |
| `meet.declined` | Meet | Sent to student when teacher declines a session | `{ requestId, reason }` | `/meet` |
| `lostfound.matched` | Lost & Found | Sent when system suggests potential match between lost and found item | `{ lostItemId, foundItemId, score }` | `/lost-found/[id]` |
| `lostfound.claim_ready` | Lost & Found | Sent to claimant when verified item is ready at drop-off desk | `{ claimId, dropOffPoint, pickupCode }` | `/lost-found/claims/[id]` |
| `club.approved` | Clubs | Sent to student when club membership is approved | `{ clubId, clubName }` | `/clubs/[id]` |
| `event.reminder` | Events | Sent before scheduled college or club event starts | `{ eventId, title, startsAt, location }` | `/events/[id]` |
| `security.new_login` | Identity | Sent on successful sign-in from a new device/IP | `{ ip, timestamp, userAgent }` | `/profile/security` |
| `acad.resource_approved` | Acad | Sent to student when their uploaded academic resource is approved | `{ resourceId, title }` | `/acad` |
| `acad.resource_rejected` | Acad | Sent to student when their uploaded academic resource is rejected | `{ resourceId, title, reason }` | `/acad` |

