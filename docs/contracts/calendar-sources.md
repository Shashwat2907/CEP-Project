# Calendar Sources Registry

All allowed `sourceType` values for `addCalendarEntry()`.
Format: lowercase snake_case.

Adding a value: include it in your feature's pull request and add a row here.
Changing or removing a value: contract change — all three must approve (CONTRACT.md §5.6).

| sourceType | Color token | Link pattern | Created by |
|---|---|---|---|
| `meet` | `--color-meet` | `/meet/[sourceId]` | meet feature on session accept |
| `event` | `--color-events` | `/events/[sourceId]` | events feature on RSVP |
| `club_event` | `--color-clubs` | `/events/[sourceId]` | clubs feature |
| `class` | `--color-class` | `/calendar` | timetable (future) |
| `personal` | `--color-personal` | `/calendar` | user creates manually |
| `complaint_followup` | `--color-complaints` | `/complaints/[sourceId]` | complaints on due date |
| `lostfound` | `--color-lostfound` | `/lost-found/[sourceId]` | lostfound on ready-for-pickup |
