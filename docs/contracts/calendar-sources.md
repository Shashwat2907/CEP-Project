# Registry: Calendar Sources

Source of Truth: `documents/CONTRACT.md` §5.4 & `documents/DESIGN.MD` §8

Source colors come from a fixed 5-color categorical set in design tokens, distinct from status colors.

| Source Type | Category | Description | Token / Color | Link Pattern |
|---|---|---|---|---|
| `meet` | Teacher Sessions | Confirmed office-hour or doubt sessions with faculty | `--color-meet` (`#3B82F6`) | `/meet/sessions/[id]` |
| `event` | College Events | University-wide hackathons, guest lectures, and cultural fests | `--color-events` (`#8B5CF6`) | `/events/[id]` |
| `club_event` | Club Activities | Workshops, meetups, and club gatherings | `--color-clubs` (`#EC4899`) | `/clubs/[clubId]/events/[id]` |
| `class` | Timetable | Scheduled lectures and lab sessions | `--color-class` (`#0EA5E9`) | `/acad/schedule` |
| `personal` | Personal Reminder | Self-created study sessions, assignment deadlines, or reminders | `--color-personal` (`#6B7280`) | `/calendar` |
| `complaints` | Grievance Hearing | Hearing or meeting scheduled regarding an open complaint | `--color-complaints` (`#D64545`) | `/complaints/[id]` |
| `lostfound` | Desk Handover | Scheduled handover time at drop-off desk for verified item | `--color-lostfound` (`#D98A00`) | `/lost-found/claims/[id]` |
