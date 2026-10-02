# Design System: Campus App (working name TBD)

> Read this before building or changing any UI. All colors, type, spacing, radii and motion come from tokens defined here and implemented in `src/styles/tokens.css` and `tailwind.config.ts`. Never hardcode a hex value, font size or animation duration in a component.

## 1. Product context
- **What it is:** one app for a college. Students and teachers (admins and authority holders later) handle campus life in one place: attendance presence, complaints, teacher meets, ID, resources, communities, clubs, events, calendar.
- **Who uses it:** students (primary, daily, mostly on phones between lectures), teachers (a few sessions a day, mostly on laptops), admins (occasional, desktop).
- **Primary job of the UI:** answer "what do I need to do or know right now on campus?" in under 3 seconds, then get out of the way.
- **Platform:** responsive web, desktop-first layout, mobile must be fully usable. A native app comes later, so keep tokens platform-neutral.

## 2. Aesthetic direction
- **Direction:** Lecture-hall clarity. Clean, confident, a little playful. Feels like a well-run campus notice board, not a corporate SaaS dashboard.
- **Where the boldness goes:** the top bar status cluster (ID chip + IN/OUT pill). It is the one memorable element and appears on every screen. Everything else stays quiet.
- **Decoration level:** minimal. No gradients, no glows, no decorative illustrations on working screens. Empty states may use one simple line illustration.
- **Tone of voice:** plain, friendly, specific. Sentence case. Verbs on buttons ("Raise complaint", "Request session"). Errors say what happened and how to fix it. Never apologize in errors.

## 3. Color
Restrained. One ink color, one highlight color, semantic colors only for status. Light theme is default; dark theme is a token swap.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` Mist | #F3F5F9 | #0F1420 | App background |
| `--surface` Paper | #FFFFFF | #171D2B | Cards, panels, sidebar |
| `--surface-sunken` | #E9EDF4 | #0B101A | Inputs, wells, chat background |
| `--border` | #D8DEE9 | #2A3347 | Dividers, card outlines |
| `--ink` Navy Ink | #16213E | #EEF1F8 | Primary text, primary buttons |
| `--ink-muted` | #5B667D | #98A3BA | Secondary text, timestamps |
| `--highlight` Pencil Yellow | #F5B700 | #FFC933 | Selected nav item marker, upvote active, focus accents, "today" in calendar |
| `--on-ink` | #FFFFFF | #0F1420 | Text on primary buttons |
| `--in-campus` | #1F9D6B | #3DC58C | IN state only |
| `--out-campus` | #5B667D | #98A3BA | OUT state (neutral, not an error) |
| `--danger` | #D64545 | #F06A6A | Errors, overdue, escalated |
| `--warning` | #D98A00 | #F2A93B | Nearing escalation |
| `--success` | #1F9D6B | #3DC58C | Resolved, confirmed |

Rules:
- Primary buttons are ink on white text. Yellow is never used as a text color on white (fails contrast); it is used as a fill, marker or underline with ink text on top.
- Complaint, request and booking states always use the same status colors everywhere (see section 9).
- Contrast: body text 4.5:1 minimum, large text and UI borders 3:1.

## 4. Typography
Two families, clearly different. Both loaded through `next/font` (self-hosted, no layout shift).

| Role | Family | Notes |
|---|---|---|
| Display and headings | Bricolage Grotesque | Weights 600 and 700. Slightly characterful, student-friendly |
| Body and UI | Instrument Sans | Weights 400, 500, 600 |
| IDs, codes, numbers in tables | JetBrains Mono | Weight 500. Student ID, QR fallback code, booking references |

Scale (px / line-height / weight):
- `display` 32/40/700 page titles, used once per page
- `h1` 24/32/600, `h2` 20/28/600, `h3` 16/24/600
- `body` 15/24/400, `body-strong` 15/24/600
- `small` 13/20/400, `meta` 12/16/500 (timestamps, counts)
- Max line length 70 characters for reading content (resources, notices, complaint descriptions).
- No all-caps labels. No tracked-out eyebrow text above headings. Don't accent a single word in a headline.

## 5. Spacing, radius, elevation
- **Base unit:** 4px. Scale: 4, 8, 12, 16, 24, 32, 48, 64.
- **Page padding:** 24px desktop, 16px mobile. **Card padding:** 16px (dense lists 12px).
- **Radius by role, not one radius for all:** `r-sm` 6px (chips, tags, inputs), `r-md` 10px (cards, dialogs), `r-lg` 16px (the ID card, hero panels), `r-full` (IN/OUT pill, avatars).
- **Elevation:** borders first, shadows rarely. Cards use a 1px `--border` and no shadow. Only floating layers (menus, dialogs, toasts) get one shadow: `0 8px 24px rgba(22,33,62,0.12)`.
- Don't chop everything into identical cards. Use lists, tables and plain sections where content is a list.

## 6. Layout (derived from the team's wireframe)
```
┌────────────┬─────────────────────────────────────────────┐
│ Logo+Name  │                     [ID] [IN | OUT] [Bell]  │  top bar 56px
│            ├─────────────────────────────────────────────┤
│ Home       │                                             │
│ Complaints │                                             │
│ Meet       │              Page content                   │
│ Acad       │              max-width 1200px               │
│ Community  │                                             │
│ Clubs      │                                             │
│ Events     │                                             │
│ Calendar   │                                             │
│ Lost&Found │                                             │
│            │                                             │
│ (avatar)   │                                             │
│ Profile    │                                             │
└────────────┴─────────────────────────────────────────────┘
 sidebar 248px
```
- Sidebar: logo and name on top, nav in the middle, profile (avatar + name) pinned at the bottom. Active item has a 3px `--highlight` bar on its left edge and `--ink` text; inactive items are `--ink-muted`.
- Top bar: left empty (page title lives in the content), right-aligned cluster: ID chip, IN/OUT pill, notification bell with unread count.
- Left-align all content. No centered body text.
- **Breakpoints:** `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Below `md` the sidebar becomes a bottom tab bar (Home, Complaints, Meet, Community, More) and the top bar keeps only IN/OUT and the bell; ID moves to a floating button on Home.
- Teachers see the same shell with a different nav (Sessions, Complaints assigned to me, Resources, Calendar, Community).

## 7. The signature element: status cluster
- **ID chip:** shows the student's short ID in JetBrains Mono. Tap opens the full digital ID card as a sheet (see components).
- **IN/OUT pill:** a two-segment pill. IN state: `--in-campus` dot and label. OUT state: neutral grey dot and label. Changing state animates the dot sliding between segments (`motion-micro`). Shows "Checking location..." while resolving and a clear message if permission is denied. Tap opens a small popover with last verified time and the campus boundary status.
- Nothing else in the UI uses a pill shape with a dot. This is how it stays recognizable.

## 8. Components
Build on shadcn/ui primitives, restyled with the tokens above. Name components by what they are for.
- **Buttons:** primary (ink fill), secondary (border, ink text), ghost (text only), destructive (danger fill). Height 40px, 36px compact. Visible focus ring: 2px `--ink` offset 2px.
- **Inputs:** `--surface-sunken` fill, 1px border, `r-sm`, 40px height, labels always visible above the field.
- **Digital ID card:** `r-lg`, `--surface`, photo, name, branch, year, roll number in mono, a rotating QR (refreshes every 30 seconds, countdown ring shown) and a "verified at HH:MM" line. Screenshot-resistance comes from the rotation, not from hiding. Yellow strip at the top edge is the only decoration.
- **Complaint row:** status chip, domain tag, title, age ("pending 6 days"), upvote button with count, current handler. Overdue rows get a `--danger` left border.
- **Escalation timeline:** vertical list showing each level, who held it, when it moved. Current level highlighted.
- **Upvote button:** outlined arrow and count; active state fills with `--highlight` and ink arrow.
- **Chat bubbles:** own messages on `--ink` with `--on-ink` text, others on `--surface`. Helper and role tags are small `r-sm` chips beside the name.
- **Calendar items:** colored left bar per source (meet, event, club, class). Source colors come from a fixed 5-color categorical set in tokens, distinct from status colors.
- **Empty states:** one line explaining what belongs here and one button that does it ("No complaints yet. Raise one" with a button).
- **Toasts:** bottom-right desktop, bottom-center mobile; same verb as the button that triggered them.

## 9. Status vocabulary (use exactly these)
| Domain | States and colors |
|---|---|
| Complaint | Open (ink-muted), In progress (ink), Escalated (danger), Resolved (success), Closed as duplicate (ink-muted) |
| Session request | Pending (warning), Accepted (ink), Declined (ink-muted), Completed (success), Cancelled (ink-muted) |
| Lost and found item | Reported (ink-muted), Matched (warning), Claim under review (ink), Ready for pickup (ink), Returned (success), Expired (ink-muted) |
| Club membership | Requested, Payment pending (warning), Member (success), Rejected (danger) |

## 10. Motion
- **Principle:** motion confirms an action or shows what changed. No scroll-triggered fades, no staggered entrances on page load, no hover lifts on cards.
- **Tokens** (Framer Motion or CSS, defined once in `src/lib/motion.ts`):
  - `motion-micro` 150ms ease-out (button press, pill dot slide, upvote)
  - `motion-panel` 240ms ease-in-out (sheets, dialogs, popovers, sidebar collapse)
  - `motion-feedback` spring(stiffness 400, damping 30) (checkbox, toggle, ID card refresh)
- No linear easing for UI movement. All components must respect `prefers-reduced-motion` by swapping to opacity-only transitions.
- One allowed moment: when the IN/OUT state flips, the pill dot slides and the top bar chip pulses once.

## 11. Accessibility floor
- Keyboard reachable everything, visible focus, logical tab order.
- Touch targets at least 44x44px on mobile.
- Status is never color only: always an icon or label as well.
- Forms: inline errors tied to fields with `aria-describedby`.
- Dark mode is first-class, not an afterthought.

## 12. Anti-patterns for this project
- No gradient backgrounds, glows or glassmorphism.
- No emoji as icons. Use one icon set (Lucide), 20px, stroke 1.75.
- No identical card grids for list content.
- No ALL CAPS labels, no `A · B · C` meta strings, no arrow glyphs appended to link text.
- No purple or neon accents. The only accent is Pencil Yellow.
- No placeholder lorem ipsum in shipped screens. Write real campus copy.

## 13. Decisions log
| Date | Decision | Rationale |
|---|---|---|
| 2026-10-02 | Navy ink plus pencil yellow, no cream or warm clay | Reads as campus stationery, avoids the generic warm-cream AI look, high contrast for outdoor phone use |
| 2026-10-02 | Sidebar plus top bar shell from team wireframe | Matches the team's layout; status cluster stays visible on every page |
| 2026-10-02 | Status cluster as signature element | IN/OUT and ID are the two things used at campus gates and in classrooms daily |
| 2026-10-02 | Two web fonts via next/font | Gives personality without layout shift; mono reserved for identifiers |
| 2026-10-02 | Borders over shadows | Cleaner on cheap laptop screens and in dark mode |