# ADR-001: Modular monolith with Supabase backend

Date: 2026-10-02  
Status: Accepted  
Decided by: Shashwat, Kushal, Kedar

## Context

Team of three students with limited time. Need a web-first app with auth, relational data, real-time features and file storage. Microservices would be too much operational overhead.

## Decision

One Next.js App Router app (modular monolith) with all backend logic inside Supabase (Postgres + RLS + Edge Functions + pg_cron). Features are separated by folder (`src/features/<name>`) and share nothing except helpers in `src/shared` and `src/lib`.

## Consequences

- **Good:** Three developers can work in parallel without stepping on each other.  
- **Good:** Managed services handle infra; we focus on product.  
- **Good:** Postgres gives constraints, transactions, RLS, full-text search, and vectors in one place.  
- **Watch:** Feature isolation must be respected — no cross-feature imports. Cross-feature effects go through `notify()`, `addCalendarEntry()` and `events_outbox`.  
- **Watch:** Supabase free tier limits — monitor usage and budget a small paid tier for the demo period.
