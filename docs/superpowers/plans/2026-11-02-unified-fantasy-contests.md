# Unified Fantasy Contests Implementation Plan

> **For agentic workers:** Execute inline using the existing workspace. Steps use checkbox syntax to track progress.

**Goal:** Present daily, weekend, weekly and multiweek fantasy contests in one catalog while preserving existing records and exposing only verified legal data sources.

**Architecture:** Keep DailyContest for short slates and League/RecurringTournament for multiweek contests. Add a shared catalog projection and extend publication to real North American games from the MLB Stats API. Persist the actual supported league with each saved game. Since this rollout uses one provider with globally scoped MLBAM IDs, a second provider and provider-qualified IDs are deferred until its data rights and identity rules are confirmed. Add the agreed Daily Lineup, Weekend Series and three recurring series behind rollout controls.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 7/PostgreSQL, SWR, existing sports providers.

**Spec:** `docs/superpowers/specs/2026-11-02-unified-fantasy-contests-design.md`

## Global Constraints

- “Ежедневная публикация не гарантируется: нужен реальный пригодный календарь и валидный пул.”
- “Латинскую Америку, включая Winter Leagues, исключить из каталога новых лиг, новых пулов и будущей автоматической публикации.”
- “Существующие данные, идентификаторы, участия, результаты и доступ к историческим деталям” remain intact.
- “Не создавать фиктивные матчи, составы, участников или результаты.”
- “NPB и KBO не включаются в публичные пулы до подтверждения прав, актуальных ростеров и статистики.”
- Preserve access rules for private traditional tournaments and existing daily-contest URLs.
- No writes to a production database or external provider/contact during implementation.

## Review Focus

- The current eligible pool uses one provider namespace with globally scoped MLBAM IDs; a second provider remains out of the pool until persisted identities become provider-qualified.
- No source availability or incomplete box score is interpreted as final zero.
- Short-contest registration locks at the earliest included game; multiweek edits preserve the existing week-lock rules.
- Public catalog merging does not expose private traditional leagues or skip rows across page boundaries.
- Removing Winter League publication does not delete or strand existing entries and history.

## File Map

- `src/shared/tournaments/recurring.ts`, `server/services/recurring-tournaments/recurring-calendar.ts`: agreed recurring series and UTC windows.
- `server/providers/**`, `server/providers/dto/**`, `src/shared/baseball/league.ts`: source registry and normalized provider data; Asian adapters stay disabled pending rights.
- `prisma/schema/daily-contest.prisma`, `prisma/schema/recurring-tournament.prisma`, game snapshots and migrations: source-qualified identity and persisted provenance.
- `server/services/daily-contests/**`, `server/services/recurring-tournaments/**`: short and multiweek publication/scoring.
- `server/repositories/**`, `server/controllers/**`, `server/entities/**`: unified catalog contract and access predicates.
- `src/entities/showcase/**`, `src/entities/tournaments/**`, `src/widgets/showcase/**`, `src/views/**`, `src/app/(app)/contests/**`: catalog, Today panel, legacy deep-link compatibility.
- `docs/showcase/operations.md`: rollout controls, source eligibility and safe retirement of future Winter publications.

## Tasks

### Task 1: Source identity and rollout registry

- [x] Define an eligibility registry for public contest sources. Only MLB, Triple-A and Double-A are enabled for contest scoring; NPB/SPAIA and KBO remain unavailable.
- [x] Save each game's actual MLB Stats API league in contest snapshots and use it for scoring. Cross-provider identity columns and backfill are deferred because no second provider is enabled; do not imply two providers are already safe to merge.
- [x] Keep NPB and KBO out of publication until complete coverage and usage rights are confirmed; no scraping adapter is added.
- [x] Gate new contest publication behind `CONTEST_PUBLISHERS_ENABLED`, disabled unless explicitly set to `true`.
- [x] Exclude Winter/Latin American leagues from new contests and product selections while retaining legacy historical access and scoring.

### Task 2: Publish daily and weekend cross-league contests

- [x] Build a mixed MLB/Triple-A/Double-A schedule and player pool, retaining actual source league per game and using MLBAM IDs for identity within the single provider.
- [x] Publish Daily Lineup and Weekend Series only when real future games and a valid lineup pool are available.
- [x] Build Weekend Series for the half-open interval Saturday 00:00 through Monday 00:00 America/New_York; entries lock at the earliest included game.
- [x] Score each short slate against its saved game set, preserving provisional state while any included box score is incomplete.
- [x] Keep daily endpoints, contest IDs and standings behavior compatible.

### Task 3: Generalize recurring contests

- [x] Plan new Friday windows as Grand Championship while preserving the legacy Winter Championship key for saved records.
- [x] Generate Weekly Sprint, Diamond Cup and Grand Championship with the agreed weekday and durations.
- [x] Save real source-qualified games and player pools; require games in every contest week and a valid lineup pool.
- [x] Score recurring games from their saved league identity and shared snapshots; incomplete results remain provisional. Connect recurring score refresh to the existing scoring cron.
- [x] Stop future Winter publication without modifying existing Winter-backed records or entries.

### Task 4: Unified Contests catalog and navigation

- [x] Add a catalog read model merging daily contests, recurring series and public League tournaments; apply public visibility before paging.
- [x] Use deterministic ordering and matching totals for current/history filters and global offset pages.
- [x] Render the unified Contests page with DailyContest detail links and compatible tournament deep links.
- [x] Add a Today panel with the next contest, local lock time, the user's active daily/series entries and recent results; show empty/error states.
- [x] Update navigation to Leagues and Contests while preserving `/tournaments` and private invitation paths.

### Task 5: Safe rollout and operations

- [x] Keep Asian sources disabled and gate publication with a disabled-by-default environment flag; scoring remains active independently for saved recurring records.
- [x] Update the runbook with source eligibility/rights, calendar behavior, checkpointing and rollback.
- [x] Run `npx tsc --noEmit`; no Prisma schema change was required, so no client regeneration or migration was needed. A production migration, seed or deploy is outside this implementation.
- [x] Record Asian display/redistribution rights and complete roster/stat coverage as rollout blockers.

