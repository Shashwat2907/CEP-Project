## What and why
<!-- One paragraph: what this slice does and why it's needed now -->

## How to test (steps a reviewer can follow)
1. 
2. 

## Screens (desktop, mobile, dark mode) if UI changed
<!-- Attach screenshots or a Loom link -->

## Database changes (migration file, RLS policies, rollback note)
<!-- List migration file names, what they add, and how to reverse -->

## Contracts touched (notification types, calendar sources, outbox events, shared components)
<!-- List any additions to docs/contracts/. Link to registry files. -->

## Checklist
- [ ] Spec in `features/<area>/README.md` is up to date
- [ ] Migration applied locally; RLS tested with an allowed and a denied case
- [ ] Types regenerated after schema change
- [ ] Matches `DESIGN.md` (no hardcoded colors, sizes or springs)
- [ ] Works on mobile width and dark mode; empty, loading and error states done
- [ ] Tests added; `npm run typecheck`, `npm run lint` and `npm test` pass
- [ ] No secrets, no console errors
- [ ] Other owners tagged if their area is affected
