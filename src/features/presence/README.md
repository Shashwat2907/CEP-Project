# Feature: Campus Presence

**Owner:** Shashwat (Platform, Identity & Campus Life)  
**Status:** In Development (`feat/presence-toggle`)  
**Source of Truth:** `documents/PLAN.md` §5.1, `documents/DESIGN.MD` §7, `documents/CONTRACT.md`

---

## 1. Overview

Campus Presence answers: **"Is this student or faculty member on campus right now?"** with a privacy-first, verified status.

### Core Principles
1. **No Raw Coordinates Stored:** The server evaluates the device position against the campus boundary polygon in-memory and stores only the verified state (`in`, `out`), zone ID, accuracy, and confidence.
2. **No Tracking Outside Campus:** When position is outside the campus polygon, the system records only `outside`. Coordinates are discarded immediately.
3. **Explicit Opt-in Consent:** No location data is processed until the user explicitly grants consent in plain language. Consent can be paused or revoked with one tap.
4. **Three States, Not Two:** `in`, `out`, `unknown` / `offline` / `denied`. Stale signals are reported as "Last seen on campus X min ago", never as "outside".

---

## 2. Data Model

### `campus_zones`
- `id` (uuid, primary key)
- `name` (text, e.g. "Main Campus", "Library Block")
- `kind` ('campus' | 'zone' | 'building')
- `polygon` (jsonb array of `{ lat, lng }` vertices)
- `is_active` (boolean)

### `presence_consent`
- `user_id` (uuid, references `profiles.id`)
- `consent_given` (boolean)
- `is_paused` (boolean)
- `visibility` ('nobody' | 'friends' | 'everyone')
- `consented_at` (timestamptz)
- `revoked_at` (timestamptz)

### `presence_status`
- `user_id` (uuid, primary key)
- `state` ('in' | 'out' | 'checking' | 'denied' | 'offline')
- `zone_id` (uuid, references `campus_zones.id`)
- `confidence` ('low' | 'medium' | 'high')
- `accuracy_meters` (numeric)
- `verified_at` (timestamptz)

---

## 3. Boundary Algorithm: Point-in-Polygon (Ray Casting)

A coordinate `(lat, lng)` is checked against the closed polygon using the standard ray-casting algorithm:
- A horizontal ray is cast from the test point towards positive infinity.
- Each intersection with a polygon edge toggles the inside/outside parity.
- Odd number of intersections = inside; even number = outside.
- If accuracy exceeds 100 meters, confidence is marked `low`.
