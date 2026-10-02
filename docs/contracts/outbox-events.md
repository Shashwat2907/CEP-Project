# Registry: Outbox Events

Source of Truth: `documents/CONTRACT.md` §5.4

The `events_outbox` table enables decoupled, guaranteed follow-up processing across features without circular dependencies.

| Event Type | Producer | Consumer | Payload Schema | Follow-up Action |
|---|---|---|---|---|
| `complaint.escalated` | Complaints | Notifications / Edge worker | `{ complaintId, level, dueAt }` | Notify assigned authority and write audit log |
| `session.accepted` | Meet | Calendar / Notifications | `{ requestId, studentId, teacherId, startsAt, endsAt, location }` | Auto-create calendar entries for student & teacher, notify student |
| `session.cancelled` | Meet | Calendar / Notifications | `{ requestId, reason, cancelledBy }` | Auto-remove calendar entries, notify counterpart |
| `roster.synced` | Admin / Roster | Community / Identity | `{ totalRows, invitedCount, deactivatedCount }` | Auto-create community channels for new batches, revoke sessions for inactive users |
| `lostfound.pickup_confirmed` | Lost & Found | Digital ID / Audit | `{ claimId, itemId, claimantId, verifiedAt }` | Record handover in audit log and close item state |
| `club.payment_received` | Clubs / Webhook | Club Members | `{ clubId, userId, paymentRef, amount }` | Activate club membership and issue welcome notification |
