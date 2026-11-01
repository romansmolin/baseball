# Play Every Day Implementation Plan

> For agentic workers: execute task-by-task using executing-plans or delegated
> subsystem implementation with a final independent review. Track evidence below.

**Goal:** Daily free baseball contests and an explicitly demo 30,000-manager community.
**Architecture:** Separate daily domain; existing MLB provider/scoring; persistent
community events; typed FSD UI. Existing weekly tournaments preserved.
**Tech Stack:** Next.js, TypeScript, Prisma/PostgreSQL, SWR, Zod, Vitest, RandomUser, DiceBear.
**Spec:** ../specs/2026-11-01-baseball-showcase-design.md

## Global constraints

Baseball only; no paid sports APIs. Preserve real accounts/payments/history.
LIVE and REPLAY separated. Free entries; no ledger effects. English product UI.
SHOWCASE_ENABLED=false by default. Server-owned pool, prices, lock and clock.

## Review focus

1. Repeat import preserves IDs/relations (task 2).
2. Concurrent submissions at lock are rejected atomically (task 4).
3. Missing stats cannot finalize as zero (task 5).
4. Source dates and New York DST remain correct (task 3).
5. Public APIs omit contact/auth fields and hide open lineups (tasks 4/7).

## Tasks

Each task: failing test, observe failure, implement, rerun relevant suite, commit
only verified files. PostgreSQL integration uses an isolated database, never an
implicit fallback to the application's DATABASE_URL.

- [ ] 1. Add daily/showcase Prisma models, shared contracts and repositories;
      generated migration; uniqueness and preservation integration tests.
- [ ] 2. RandomUser 1.4 stable-seed manifest importer and safe legacy-user reuse;
      local DiceBear 10 notionists endpoint; deterministic/idempotent/error tests.
- [ ] 3. Daily calendar, game rosters, canonical player pools and verified 2025
      archive; DST/doubleheader/transferred-player/insufficient-pool tests.
- [ ] 4. Authenticated free entry/edit API with canonical validation, atomic
      deadline check and prelock lineup privacy; concurrency tests.
- [ ] 5. Shared game snapshots and daily scoring using existing math, provisional
      missing data, 72h postponed-game policy, cancellation and competition ties.
- [ ] 6. Valid deterministic strategies, 30-day/1,500-per-day cohort rotation,
      persisted events and bounded leased/resumable worker.
- [ ] 7. Paged public catalogue/standings, community overview/activity and manager
      profiles/rankings; privacy and REAL/DEMO and LIVE/REPLAY separation tests.
- [ ] 8. First approved layout on both dashboards, free lineup builder, catalogue,
      contest details, manager directory/profile and compact landing preview.
- [ ] 9. Cron, authenticated refresh, flag, dry-run/seed/tick commands, runbook;
      full suite, lint, typecheck, build, isolated full seed and responsive QA.

## API

GET /api/daily-contests; GET /api/daily-contests/[id];
GET|PUT /api/me/daily-contests/[id]/entry;
GET /api/daily-contests/[id]/standings;
GET /api/daily-contests/[id]/entries/[entryId];
GET /api/community/overview; GET /api/community/activity;
GET /api/managers; GET /api/managers/[id];
POST /api/me/showcase/refresh. Default list size 20, maximum 100.

## Validation and rollout

npm test; npm run lint; npx tsc --noEmit; npm run build.
Browser: 360/768/1440, new account dashboard, live and Replay, valid/invalid
entry, locked entry, results, manager history, upstream failure/empty states.
Full isolated seed: 30,000 profiles and 30 history days. Before working DB
changes require validated dry-run and backup. No deployment implied.
