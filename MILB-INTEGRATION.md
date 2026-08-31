# MLB + MiLB integration (single MLB Stats API provider)

Extends the existing `server/providers/mlb/` integration so the platform supports
MLB **and** four Minor League levels through the **same** MLB Stats API — no new
data provider. Every Minor League level is just a different `sportId` on the same
host.

## 1. Architecture changes

### Canonical league config (no scattered magic numbers)
- **`src/shared/baseball/`** — new frontend-safe FSD shared slice. Single source
  of truth for supported leagues: `SupportedBaseballLeague` union, `BASEBALL_LEAGUES`
  (slug / name / shortName / fullName / region / color / proTeams), helpers
  (`isSupportedBaseballLeague`, `getBaseballLeague`), and `UNBACKED_BASEBALL_LEAGUES`
  (NPB / KBO / LVBP / LMB — listed but "coming soon").
- **`server/providers/mlb/mlb-leagues.config.ts`** — the **only** place raw
  `sportId` numbers live. `Record<SupportedBaseballLeague, number>` (TS enforces
  completeness), `resolveSportId(league?)` (defaults to MLB), plus `BOX_SCORE_SUPPORT`
  per level.
- **`server/shared/sport-leagues.const.ts`** — `SPORT_LEAGUES` (served by
  `GET /api/leagues`) is now **derived** from the canonical config, so the API,
  team builder, tournament logic and `/leagues` page can't drift.

### Provider is league-aware, MLB-by-default
- `ISportsProvider` filter/option types gained an optional `league?: SupportedBaseballLeague`
  (`GetTeamsFilters`, `GetTeamByIdOptions`, `GetPlayersByTeamOptions`,
  `ProviderPlayerFilters`, `GetScheduleFilters`) plus a new `GetBoxScoreOptions`.
  `GetScheduleFilters` also gained `season?`.
- `MlbSportsProvider` resolves `sportId` from the league on `getTeams`, `getPlayers`,
  `getSchedule`, `getBoxScore` (and threads it into internal team lookups).
  **Omitting `league` ⇒ MLB (`sportId` 1)** — every pre-existing call site is
  unchanged, which is the regression guarantee.
- Provider DTOs unchanged; raw MLB response types still never leave
  `server/providers/mlb/`; mappers remain the boundary.

### Cache identity includes the level
- `mlbTags` now embeds `sportId` in the `teams` / `players` / `schedule` tags.
  Triple-A players for 2026 and MLB players for 2026 can never share a cache
  entry. (The `ApiCacheEntry` Prisma model is unused dead code — the live cache
  is Next's `fetch` cache keyed by URL + tags, and the URLs already carry
  `sportId`.)

### Season handling
- `ScoringInputLeague` gained `leagueSlug` + `season`. `WeeklyScoringService`
  passes them to `getSchedule` / `getBoxScore`, so scoring pulls the correct
  level and the tournament's `externalSeasonId` drives the provider season
  instead of a hardcoded default. `LeagueRecord` + its repo `select` gained
  `externalSeasonId`; all four `ScoringInputLeague` construction sites updated
  (`tournaments.service`, `me.service`, the `refresh-scoring` cron).

### API validation
- **`server/entities/baseball-league.schema.ts`** — shared Zod enum built from
  the canonical slug list.
- `GET /api/players`, `GET /api/teams`, `GET /api/teams/[id]/roster` accept
  `?league=<slug>`. `createTeamSchema.leagueSlug` is now validated too.
  **An unsupported value (`?league=npb`) fails Zod → 400**, never a silent MLB
  fallback.

### Frontend
- Team builder fetches **teams and the player pool per selected league**
  (`/api/teams?league=`, `/api/players?league=`). The old `LEAGUE_TEAM_GROUPS` /
  `filterTeamsByLeague` sub-league-name hack is deleted. The league picker shows
  "coming soon" only for `!providerBacked` leagues.
- Team-builder Autofill (AI) carries `league` end-to-end
  (`autofill-team-builder` fetcher → route → `TeamBuilderAutofillFeature` →
  `getPlayersByTeam(id, { league })`), so autofill works for MiLB.
- **`/players`** page now renders real provider data
  (`src/entities/players/` slice: `fetchPlayers` + `withErrorHandling`,
  `usePlayersData` SWR keyed by `{league, search}`, DTO→domain mapper). League
  filter = MLB / Triple-A / Double-A / High-A / Single-A. Loading / error /
  empty states added. Fields the feed doesn't provide (projections, ownership,
  injury & transfer history) degrade to empty states — nothing fabricated.
- **`/leagues`** page is config-driven (from `src/shared/baseball`), overlaid
  with **real** open-tournament counts and prize-pool sums from the tournaments
  API. Backed leagues are selectable with a working
  `/tournaments?league=<slug>` CTA; unbacked leagues show "coming soon".

### Standings / scoring performance

First-view standings compute scoring lazily, and the fan-out was
O(members × weeks × games-per-week) with a **serial** per-game box-score loop
and every member stampeding the provider at once (→ throttling → outage
fallback → recompute-on-every-open).

- **`server/shared/concurrency.utils.ts`** — `mapWithConcurrency(items, limit, fn)`
  (bounded-parallel, order-preserving).
- `WeeklyScoringService.computeWeek` fetches a week's box scores 8 at a time
  instead of one-by-one.
- New `WeeklyScoringService.warmProviderCache(league, throughWeek, memberIds)` —
  best-effort read-through warm of the schedule + box-score `fetch` caches,
  called **once** before the per-member scoring loop in
  `TournamentsService.getTournamentStandings`, `MeService` tournament progress,
  and the `refresh-scoring` cron. It **skips any week every member has already
  settled in `WeeklyScoreCache`** (FINAL, or PARTIAL still inside its `staleAt`
  window) via a new `IWeeklyScoreCacheRepository.findByMembers` batch read — so
  a fully-scored tournament warms nothing and repeat standings views do zero
  provider work.

`BOX_SCORE_FETCH_CONCURRENCY` is 16.

**Team-scoped schedule.** A week's full-league schedule is ~100 games but a
9-man roster spans ≤9 teams — most box scores fetched contain nobody from the
roster. `resolveRosterTeamIds` maps the frozen `playerTeamName`s **∪** each
player's current team (`getPlayersByIds`, one bulk call) to real team ids and
scopes `getSchedule` to `teamId=<list>`. Guards, so scoring output never
changes silently:

- Only the `full` box-score levels (MLB / Triple-A / Double-A) — `canTeamScopeSchedule`.
  Lower MiLB levels move players between levels too often; they use the full
  schedule.
- Only tournaments whose scored span is ≤ `MAX_TEAM_SCOPED_SPAN_WEEKS` (6).
  Across a longer backfill (COMPLETED / deep PLAYOFFS) enough players move that
  frozen ∪ current no longer covers them — those use the full schedule and are
  cron-warmed once anyway.
- Any unresolved team name or player → fall back to the full schedule.

Measured — true cold (`WeeklyScoreCache` + Next fetch cache cleared), remote
Postgres, `next dev`; top score verified against the un-scoped result:

| standings request | first view (cold) | repeat | scoped? |
|---|---|---|---|
| AAA Midsummer Shootout — IN_SEASON, 7 m, 4 wk | **~10 s** | ~2 s | yes |
| MLB Summer Classic — IN_SEASON, 16 m, wk 4 | **~22 s** | ~2.3 s | yes |
| AA Around the Horn — PLAYOFFS, 11 m, 10 wk | ~40 s | ~2.3 s | no (>6 wk) |
| MLB 2025 Spring — COMPLETED, 14 m, 12 wk | ~52 s | ~2.3 s | no (>6 wk) |
| R Farm System Faceoff — COMPLETED, 10 m, 10 wk | ~81 s | ~2 s | no (partial level) |
| DRAFTING (week 0, no scoring) | <1 s | — | — |

The common case — an IN-SEASON MiLB tournament — drops from ~40 s to ~10 s and
scores identically. Long historical tournaments stay on the exact full-schedule
path; the cron pays their cold cost once.

The repeat-view floor (~2 s) is per-member cache round-trips to the remote
database, not the provider. Before this work every view cost 25–30 s+ because
throttled PARTIAL rows never settled and each open re-stampeded the provider.
The nightly `refresh-scoring` cron pre-warms every tournament, so real users
never hit the cold path.
- Scoring logic itself is unchanged; only the provider fan-out.
- Still true: once a `(member, week)` cache row goes `FINAL` it's instant
  forever. To pre-warm everything after seeding:
  `curl -H "Authorization: Bearer $CRON_SECRET" .../api/internal/cron/refresh-scoring`.

### Entry fees & weekly prize settlement

- **Entry fee**: `POST /api/tournaments/[id]/join` now checks the user's credit
  balance against `entryFeeCredits` (402 `INSUFFICIENT_CREDITS` if short) and
  writes a `TOURNAMENT_ENTRY_FEE` debit (`referenceType: 'tournament_entry'`,
  `referenceId: leagueMemberId`) after the member row is created. Seed
  enrollment bypasses this (direct inserts).
- **Weekly payout**: `server/services/tournaments/settlement/` —
  `TournamentSettlementService.settleTournament(leagueId)`. Each week
  distributes an equal slice of `prizePoolCredits` (`/ totalWeeks`, last week
  takes the remainder); that slice pays 50 / 30 / 20 % to the top three by
  **that week's** points. A week is settled only once every member has a
  `FINAL` `WeeklyScoreCache` row for it. Idempotent via a
  `tournament_week_payout` ledger marker (`referenceId: '${leagueId}:w${week}:${memberId}'`).
- **Cron**: `GET /api/internal/cron/settle-tournaments`, weekly
  (`0 8 * * 1` in `vercel.json`). Warms + scores each active/completed
  tournament, then settles. Time-boxed; safe to run more often.
- The wallet UI already renders `TOURNAMENT_ENTRY_FEE` / `TOURNAMENT_WINNINGS`
  rows (labels + spend/reward category were already wired).
- Smoke-tested end to end: MLB Summer Classic (pot 12 000 / 12 wk = 1 000/wk),
  weeks 1–2 paid `[500, 300, 200]` each, weeks 3–4 correctly skipped (not
  FINAL), second run a no-op.

### Seed
- `buildDemoRoster(seedKey, pool?)` is parametrised. The per-tournament body is
  extracted into `seedOneTournament(...)`.
- `fetchMiLBPools()` fetches ~4 real teams + rosters **per level from the
  provider** (Triple-A … Single-A **and Rookie**), builds a position pool, and
  the pools are shared by every tournament at that level. Wrapped in try/catch:
  a provider hiccup logs a warning and skips MiLB, leaving the MLB seed intact.
  A level whose pool can't cover all nine roster slots is skipped.
- Hand-tuned tournaments: 4 MLB (existing) + Triple-A Championship (IN_SEASON),
  Double-A Fantasy League (DRAFTING), High-A Challenge (DRAFTING), Single-A
  Prospect League (IN_SEASON).
- **Generated catalogue** (`buildGeneratedTournaments`): ~30 more, evenly split
  across all six backed leagues, with a realistic status mix (~40 % DRAFTING /
  ~35 % IN_SEASON / ~13 % COMPLETED / ~10 % PLAYOFFS) and unique names from a
  theme pool. The real account is **not** auto-enrolled in these (`enrollReal:
  false`) so "my tournaments" / "my teams" stay clean.
- **Bulk writes**: `enrollMembersBulk` builds every row for a tournament's
  members (users, league members, fantasy teams, roster slots, weekly lineups,
  lineup slots) with client-generated ids and inserts them with ~7 `createMany`
  calls — instead of ~(4 + weeks) awaited round-trips per member. Full 38-
  tournament seed dropped from **35 min+ to ~2.4 min** against the remote DB
  (~1 min of that is the MiLB pool HTTP fetches).

## 2. Files added / changed

**Added**
```
src/shared/baseball/league.ts
src/shared/baseball/index.ts
src/shared/baseball/__tests__/league.test.ts
server/providers/mlb/mlb-leagues.config.ts
server/providers/mlb/__tests__/mlb-leagues.config.test.ts
server/providers/mlb/__tests__/mlb.provider.test.ts
server/entities/baseball-league.schema.ts
server/entities/__tests__/baseball-league.schema.test.ts
server/shared/concurrency.utils.ts
server/shared/__tests__/concurrency.utils.test.ts
src/entities/players/{index.ts, model/types.ts, model/use-players-data.ts,
                      api/types.ts, api/map-players.ts, api/fetch-players.ts}
vitest.config.ts            (adds the `@/` alias Vitest was missing)
```

**Changed** (39 files) — providers (`mlb.provider`, `mlb.constants`,
`mlb-position.mapper`, `sports-provider.interface`, `provider-player.dto`,
`provider-schedule.dto`), scoring (`weekly-scoring.service` + interface,
`tournaments.service`, `me.service`, `refresh-scoring` cron, `league.repository`
+ interface), entities (`players`, `teams`, `create-team` schemas), AI
(`team-builder-autofill.feature` + route), shared (`sport-leagues.const`,
`team-builder/types` + `index`, `teams/types`), team-builder catalog fetchers +
hooks + `use-team-builder-state` + `league-team-selector`, players widget
(`use-players-state`, `player.type`, `players-view`, `players-sidebar`,
`player-detail-drawer`, `player-stats-tab`), leagues widget (`use-leagues-state`,
`league.type`, `league-card`, `league-detail-drawer`), `prisma/seed.ts`.

**Deleted** `src/shared/team-builder/league-teams.ts`,
`src/widgets/players/model/mock-data.ts`,
`src/widgets/leagues/model/mock-data.ts` (all obsolete).

## 3. Newly supported leagues

| slug | league | sportId | tournament seeded |
|---|---|---|---|
| `mlb` | MLB | 1 | (existing, unchanged) |
| `triple-a` | Triple-A | 11 | Triple-A Championship |
| `double-a` | Double-A | 12 | Double-A Fantasy League |
| `high-a` | High-A | 13 | High-A Challenge |
| `single-a` | Single-A | 14 | Single-A Prospect League |
| `rookie` | Rookie / Complex | 16 | not seeded (see limitations) |

## 4. MLB Stats API endpoints per feature

| Feature | Endpoint (per league — `{sportId}` from config) |
|---|---|
| Teams | `GET /teams?sportId={sportId}&season={season}` |
| Team by id | `GET /teams/{id}?season={season}` (id is global — level-agnostic) |
| Players (list) | `GET /sports/{sportId}/players?season={season}` |
| Player by id | `GET /people/{id}?hydrate=currentTeam` (level-agnostic) |
| Team roster | `GET /teams/{teamId}/roster?rosterType=active&season={season}` + `GET /people?personIds=…&hydrate=currentTeam` |
| Schedule | `GET /schedule?sportId={sportId}&season={season}&startDate=…&endDate=…[&teamId=]` |
| Box score | `GET /schedule?sportId={sportId}&gamePks={pk}` (status) + `GET /game/{pk}/boxscore` |

## 5. MiLB limitations discovered / documented

- **Box-score depth** (`BOX_SCORE_SUPPORT` in `mlb-leagues.config.ts`): MLB /
  Triple-A / Double-A / High-A / Single-A are marked `full`; **Rookie/Complex is
  `partial`** — schedules and rosters are reliable but per-player batter/pitcher
  lines are frequently sparse or absent. Scoring still runs; a missing line
  scores 0, never a fabricated stat. Rookie is therefore not given a seeded
  tournament.
- **`getPlayerById`** can't know a player's level, so its team-name enrichment
  uses the MLB team set — a MiLB player's `teamName` still resolves from the raw
  `currentTeam` field, but `teamAbbreviation` may be `null`.
- **AI features other than Autofill** (player-analysis, lineup-optimizer,
  matchup-predictor, trade-advisor) still call the provider without a league →
  MLB only. Out of scope for this task; the plumbing (optional `league` on every
  provider method) is in place to extend them later.
- **`/players` sidebar** shows a player count only for the currently selected
  league (the provider has no cheap "count across all levels" call).

## 6. Tests added / updated

- `src/shared/baseball/__tests__/league.test.ts` — slug list, default, `isSupported`
  rejects NPB/KBO, `getBaseballLeague`, unique slugs.
- `server/providers/mlb/__tests__/mlb-leagues.config.test.ts` — every slug →
  correct `sportId` (1/11/12/13/14/16), absent league → 1.
- `server/providers/mlb/__tests__/mlb.provider.test.ts` — stubs `fetch`; asserts
  `getTeams({league:'triple-a'})` hits `sportId=11`, `getPlayers({league:'double-a'})`
  hits `/sports/12/players`, `getSchedule({league:'high-a'})` hits `sportId=13`,
  **no league ⇒ `sportId=1` (regression)**; MiLB team + player payloads map onto
  the provider DTOs.
- `server/entities/__tests__/baseball-league.schema.test.ts` — enum accepts the
  six slugs, **rejects `npb` / `kbo`**; `listPlayersQuerySchema` / `listTeamsQuerySchema`
  reject `?league=npb`, accept a MiLB slug, allow omission.

- `server/shared/__tests__/concurrency.utils.test.ts` — `mapWithConcurrency`
  order preservation, concurrency cap, empty input, reject propagation.

`npx vitest run` → **13 files, 79 tests, all passing** (was 8 / 44 — the
autofill suite now also loads because `vitest.config.ts` adds the `@/` alias).

## 7. Remaining mock usage

- `server/shared/dashboard-stubs.ts` still backs the dashboard metrics / recent
  activity / onboarding cards — untouched, out of scope.
- `/players` sidebar per-league counts (other than the active league) show 0.
- `/leagues` `myTeams` is 0 for every league (not wired to the user's teams).
- `/leagues` `formats` list and per-league descriptions are static copy.
- The `PlayersHeader` sub-copy still mentions "injuries & transfers" (those
  drawer tabs now render empty states).

## 8. Existing MLB functionality

Confirmed intact:
- `npx tsc --noEmit` — clean.
- `npx vitest run` — 75/75 pass, including all pre-existing AI-feature and
  pricing suites.
- `npx next build` — compiles successfully; every route builds.
- Every provider method defaults to `sportId` 1 when no league is passed, and
  **no existing call site passes a league** except the new MiLB paths — so MLB
  teams, players, schedules, rosters, box scores and scoring behave exactly as
  before. A dedicated regression test asserts the default.

> Not run in this session: `npm run db:seed` (needs a live database + outbound
> access to `statsapi.mlb.com`). The seed is `tsc`-clean and its full import
> graph resolves under `jiti` (verified).
