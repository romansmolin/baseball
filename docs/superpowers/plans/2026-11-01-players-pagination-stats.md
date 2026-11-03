# Players Pagination and Season Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show no more than ten Players per page, with real MLB season statistics and available player photos.

**Architecture:** The Players API filters and paginates before returning results, then hydrates statistics for only those ten players in one batch. The client requests pages through SWR and renders concise stats in rows, full available stats in the detail drawer, and photos with initials fallback.

**Tech Stack:** Next.js, React, TypeScript, Zod, SWR, Vitest, MLB Stats API.

**Spec:** `docs/superpowers/specs/2026-11-01-players-pagination-stats-design.md`

## Global Constraints

- A page contains at most 10 players.
- Use the configured default season and real provider stats only.
- Missing stats remain unavailable; never synthesize zero values.
- Use MLB photo URLs when available; fall back to initials.
- Do not show placeholder projections, fantasy salary, or ownership.

## Review Focus

1. Page boundaries and filters: a filter change returns to page one, and filtering happens before slicing — Task 2.
2. MLB stats hydration: a batch request enriches only the requested page and handles missing/dual-role lines — Task 1.
3. Empty or unavailable stats/photos: UI shows no fabricated values and preserves initials fallback — Task 2.

---

### Task 1: Server player pagination and MLB season statistics

**Files:**
- Modify: `server/providers/dto/provider-player.dto.ts`
- Modify: `server/providers/mlb/types/mlb-person.raw.ts`
- Modify: `server/providers/mlb/mappers/mlb-person.mapper.ts`
- Modify: `server/providers/mlb/mlb.provider.ts`
- Modify: `server/entities/players/players.schema.ts`
- Modify: `server/controllers/players/players.controller.ts`
- Test: `server/providers/mlb/__tests__/mlb.provider.test.ts`
- Test: `server/entities/__tests__/baseball-league.schema.test.ts`

**Interfaces:**
- `ProviderPlayer` adds optional `battingStats` and `pitchingStats` records of actual season totals.
- `ProviderPlayerFilters` accepts `position`, `active`, `limit`, `offset` and configured `season`.
- `GET /api/players` returns at most 10 enriched players and the filtered total.

- [x] Write tests that prove filters are applied before pagination, page two has no repeated page-one IDs, and a request larger than 10 is capped to 10.
- [x] Write provider tests that verify one batched season-stat hydration request enriches the selected page, returns both batting and pitching lines when available, and leaves missing lines absent.
- [x] Run the focused tests and confirm they fail for the missing behavior.
- [x] Add raw stat DTOs and map MLB season splits into typed player batting/pitching totals.
- [x] Fetch stats for only the current page in one batched `people` hydration request using the configured default season. Keep the existing player list filters, apply position/availability before slicing, and cap `limit` at 10.
- [x] Rerun the focused tests and provider/API tests; run `npx tsc --noEmit`.

### Task 2: Ten-player pages and truthful player presentation

**Files:**
- Modify: `src/entities/players/api/fetch-players.ts`
- Modify: `src/entities/players/api/types.ts`
- Modify: `src/entities/players/api/map-players.ts`
- Modify: `src/entities/players/model/types.ts`
- Modify: `src/entities/players/model/use-players-data.ts`
- Modify: `src/widgets/players/model/use-players-state.ts`
- Modify: `src/widgets/players/ui/players-view-layout.tsx`
- Modify: `src/widgets/players/ui/players-view.tsx`
- Modify: `src/widgets/players/ui/player-row.tsx`
- Modify: `src/widgets/players/ui/players-list.tsx`
- Modify: `src/widgets/players/ui/player-detail-drawer.tsx`
- Modify: `src/widgets/players/ui/tabs/player-stats-tab.tsx`
- Modify: `src/widgets/players/ui/players-toolbar.tsx`
- Test: `src/widgets/players/model/player-filters.test.ts` or focused state helper tests alongside the implementation

**Interfaces:**
- Player requests include `limit: 10` and current `offset`; SWR keys include page and active filters.
- Page navigation receives `{ offset, limit: 10, total, onChange }` and displays the current range.
- Player rows render batter AVG/HR/RBI or pitcher ERA/W/SO; drawer renders all available stats for the configured season.

- [x] Write tests for page-range labels, offset reset on search/filter changes, and the ten-player maximum; confirm they fail first.
- [x] Implement page controls and request parameters; reset page when league, search, position, or availability changes.
- [x] Replace zero-valued fantasy columns/sorts with real concise stats and stable name ordering.
- [x] Render provider photos with an `onError` fallback to initials in both list and detail views.
- [x] Show every available batting/pitching stat in the detail drawer, labeled with the configured season; show a clear unavailable state when no stat line exists.
- [x] Rerun focused UI/model tests and `npx eslint` on changed files.

### Task 3: End-to-end verification

**Files:** no additional files unless verification exposes a required fix.

- [x] Run the full `npm test` suite and read the complete result.
- [x] Run `npx tsc --noEmit`, `npm run lint`, and `git diff --check`. Full-project lint reports errors in unrelated files; lint for all changed source files passes.
- [x] Attempt local UI verification. The production server could not bind to `127.0.0.1:3107` (`listen EPERM`), so visual browser checks were unavailable in this environment.
- [x] Confirm no player API response exceeds ten entries and no placeholder fantasy zeros remain in the Players UI.

## Release

No database migration is needed. The change uses the existing MLB provider and API route; provider cache revalidation remains responsible for seasonal refreshes.
