# Fantasy Assistant Pivot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the app from a contest platform into a fantasy-baseball assistant: remove all user-vs-user competition, add deep player analytics, compare, an upcoming-games hub with outcome estimates, and credit-paid AI picks per game.

**Architecture:** Cut first (Tasks 1–4), then build in layers: provider data (Savant CSV + richer MLB Stats API) → pure estimate functions → read APIs → UI → AI. Estimates are deterministic pure functions; AI only explains and recommends, and receives those numbers as input.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7 + PostgreSQL, SWR, Zustand, Tailwind 4, Vitest, zod, OpenAI Responses API (existing `server/services/ai`).

**Spec:** `docs/superpowers/specs/2026-11-18-fantasy-assistant-pivot-design.md`

## Global Constraints

- Architecture rules of `CLAUDE.md` and `docs/*.md` apply: import only from a slice's `index.ts`; fetchers are standalone and wrapped in `withErrorHandling`; mappers convert DTO to domain model inside the fetcher; no fetch/effects in UI components; Zod schemas in `server/entities/{entity}/{entity}.schema.ts`; route handlers parse `request.json()`; GET handlers pass primitives; classes declare properties explicitly (no parameter-property shorthand); strip `passwordHash` with `omit`.
- File names `kebab-case`; API files `{entity}.api.ts`, constants `{entity}.const.ts`, types `{entity}.type.ts`, enums `{entity}.enum.ts`, services `{entity}.service.ts`.
- Schema changes only via `npx prisma migrate dev --name <change>` from the project root; never hand-edit migrations, never `prisma db push`. Run against the LOCAL database only; never apply to production.
- Credit ledger rows are never deleted or rewritten. Enum values `TOURNAMENT_ENTRY_FEE` and `TOURNAMENT_WINNINGS` stay in `CreditTransactionType`; nothing new writes them.
- No sportsbook odds, betting lines or betting advice anywhere. Probabilities are labelled "estimate" with a confidence level; no value shown with more precision than whole percent.
- No FanGraphs / Baseball-Reference scraping. Data sources are MLB Stats API and Baseball Savant CSV only.
- Free: players, stats, compare, schedule, deterministic estimates. Paid in credits: every AI call.
- Work on `main`, no push. Every commit message ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- After every task: `npx tsc --noEmit` and `npm test` are green before the commit.

## Review Focus

Inputs and conditions the spec implies but the feature tasks do not otherwise cover; each has a test in the owning task.

1. Savant CSV starts with a BOM and has quoted names containing commas (`"Lindor, Francisco"`) — parsed correctly (Task 5).
2. Player with no plate appearances or innings (rookie, call-up) — analytics and compare show `null`, never `NaN` or 0-as-real (Tasks 6, 7, 9).
3. Game with no probable pitcher announced — estimate still returns, confidence `low` (Task 7).
4. Two-way player (hitting + pitching stat groups, e.g. Ohtani) — both groups returned, not one overwriting the other (Task 6).
5. User with too few credits calls an AI feature — rejected before any provider call and nothing charged; provider failure after charge reserves nothing (Task 13).

---

## Task 1: Cut frontend, API routes and crons

**Files:**
- Delete routes: `src/app/(app)/{contests,leagues,managers,tournaments,rules,stats,games}/`, `src/app/api/{community,contests,daily-contests,leagues,managers,performers,standings,tournaments,games/results}/`, `src/app/api/me/{daily-contests,tournaments,showcase,activity,metrics,onboarding}/`, `src/app/api/internal/cron/*` (all 7 directories)
- Delete UI: `src/views/{contests,daily-contests,games-results,leagues,managers,rules,stats,tournaments}/`, `src/widgets/{games-results,leagues,rules,showcase,stats,tournament-progress,tournaments}/`, `src/features/{daily-entry,tournament-join}/`, `src/entities/{showcase,stats,tournaments}/`, tests listed under those folders
- Modify: `src/widgets/dashboard/model/nav.const.ts`, `src/widgets/dashboard/ui/dashboard-header.tsx`, `src/widgets/dashboard/ui/onboarding-checklist.tsx`, `src/widgets/dashboard/ui/user-menu.tsx` (drop Rules), `src/app/(app)/layout.tsx` (drop `showcaseEnabled`), `vercel.json` (`"crons": []`)
- Keep: `src/app/api/me/teams/[id]/lineup/` (roster edit; Task 2 removes its `WeeklyLineupRepository` use), `src/app/api/games/upcoming/`, `src/app/api/players/`, `src/app/api/me/{teams,credits,budget,ai}/`, `src/app/api/teams/` (MLB team catalog the builder calls via `fetch-teams.ts`), `src/app/api/payments/`, `src/app/api/wallet/`, `src/app/api/ai/`

**Interfaces:**
- Produces: `dashboardNav` = Dashboard (`/dashboard`), Players (`/players`), Games (`/games`), Compare (`/compare`), My teams (`/teams`). Routes `/games` and `/compare` are re-created in Tasks 9–11; until then nav links may 404 (acceptable between tasks).

- [ ] **Step 1:** Delete every path listed under "Delete routes" and "Delete UI" with `git rm -r`.
- [ ] **Step 2:** Rewrite `dashboardNav` with the five entries above; remove Contests/Managers/Leagues usage from `dashboard-header.tsx`; remove the `tournament` onboarding step links in `onboarding-checklist.tsx`.
- [ ] **Step 3:** Run `npx tsc --noEmit`; fix every remaining import of a deleted slice (dashboard widgets that show contest metrics, `top-performers`, `recent-activity`, `metric-cards` are deleted with their model types if only contests used them; `next-games` stays).
- [ ] **Step 4:** Run `npm test`; expected: PASS (tests of deleted slices are gone with them).
- [ ] **Step 5:** Commit `refactor: remove contest, league and showcase UI, routes and crons`.

## Task 2: Cut server modules

**Files:**
- Delete: `server/services/{community,daily-contests,demo-users,leagues,performers,recurring-tournaments,scoring,showcase,standings,tournaments,weekly-lineup}/`, `server/controllers/{daily-contests,leagues,performers,standings,tournaments}/`, `server/repositories/{contest-catalog,daily-contests,game-snapshots,league,league-member,recurring-tournaments,scoring-rule,tournaments,weekly-lineup,weekly-score-cache}/`, `server/entities/{daily-contests,performers,standings,tournaments}/`, `server/models/tournament/`, `server/providers/contest-source-registry.ts`, `server/shared/{showcase-config.ts,dashboard-stubs.ts}`, `server/providers/api-sports/` (empty stub), their tests
- Modify: `server/services/me/me.service.ts` + interface, `server/controllers/me/me.controller.ts` + interface (remove `getMetrics`, `getActivity`, `getOnboarding`, `getMyTournaments`, `getMyTournamentProgress`), `server/services/games/games.service.ts` + interface (remove `getRecentGames`; `GAME_LEAGUES` becomes `['mlb']`), `server/repositories/fantasy-team/*` (remove `findByLeagueMemberId`), `server/services/wallet/wallet.service.ts` (credit summary no longer counts entry fees/winnings), `server/repositories/credit/credit.repository*.ts` (drop contest-specific queries), `server/services/ai/features/{lineup-optimizer,trade-advisor,team-builder-autofill}.feature.ts` and their prompts (remove League/tournament/WeeklyLineup reads — they must work from the user's saved `FantasyTeam` and provider data only)
- Delete from `server/providers/mlb/mlb.provider.ts` any contest-only method (`getGameRoster`, and `ProviderGameRoster` in the interface) once nothing references it

**Interfaces:**
- Consumes: kept `ISportsProvider`, `IFantasyTeamRepository`, `ICreditRepository`.
- Produces: `IMeService` = `{ getCredits, getMyTeams, getBudget, createMyTeam, renameMyTeam, updateMyTeamLineup }` (same signatures as today minus the removed methods).

- [ ] **Step 1:** `git rm -r` the paths under "Delete".
- [ ] **Step 2:** Trim `IMeService` / `IMeController` / their implementations to the interface above; update `src/app/api/me/*/route.ts` files that remain.
- [ ] **Step 3:** Strip league/tournament coupling from the three AI features and prompts; update their tests in `server/services/ai/__tests__/features/` to fixtures without league data. Expected: those tests PASS.
- [ ] **Step 4:** `npx tsc --noEmit` clean; `npm test` PASS.
- [ ] **Step 5:** Commit `refactor: remove contest, scoring, showcase and league server code`.

## Task 3: Cut shared leftovers

**Files:**
- Delete: `src/shared/{daily-contests,tournaments,community,stats}/`, contest-only entries in `src/shared/{dashboard,teams,wallet,games}/types.ts`, `src/widgets/my-teams` parts that show tournament/score columns, `src/entities/dashboard` model for contest metrics
- Modify: `server/shared/sport-leagues.const.ts` (keep as is if still referenced by team-builder, else delete), `src/shared/teams/types.ts` (remove `totalScore`, league membership fields from `Team`)

- [ ] **Step 1:** `git grep -nE "tournament|contest|standings|showcase|winnings|prize|entry fee|leagueMember" -- src server` and list every hit that is not a deleted file.
- [ ] **Step 2:** Remove or rewrite each hit (types first, then UI, then server). `CreditTransactionType` mentions in the wallet history UI keep a human label for the two historical types (shown as "Entry fee (legacy)" / "Winnings (legacy)").
- [ ] **Step 3:** `npx tsc --noEmit` and `npm test` green.
- [ ] **Step 4:** Commit `refactor: remove contest types and leftovers from shared layers`.

## Task 4: Database migration, seed and scripts

**Files:**
- Modify: `prisma/schema/schema.prisma` and domain files; delete `prisma/schema/{league,daily-contest,recurring-tournament,scoring,showcase}.prisma`; `prisma/schema/fantasy-team.prisma` (remove `leagueMemberId`, `leagueMember`, `totalScore`, `WeeklyLineup*` models and relations); `prisma/schema/user.prisma` (remove relations to dropped models, `DemoProfile`); `prisma/schema/cache.prisma` (leave)
- Delete: `prisma/{enroll-demo-users,prepare-showcase-archive,promote-season-showcase-to-live,rename-demo-teams,rename-generic-contests,retire-open-replays,seed-showcase-*,seed-users,tick-showcase,showcase-cli}.*`
- Modify: `prisma/seed.ts` (keep only AI feature rows + scoring-free setup; delete tournament and seed-user creation), `package.json` (remove all `showcase:*`, `db:seed-users`, `db:enroll-demo-users` scripts), `server/lib/env.ts` if showcase env helpers exist

**Interfaces:**
- Produces: Prisma models kept: `User`, `Session`, `Account`, `Verification`, `Payment`, `CreditTransaction`, `AIFeature`, `AIUsageLog`, `FantasyTeam`, `RosterSlot`, `ApiCacheEntry`. All others dropped.

- [ ] **Step 1:** Back up the local DB: `pg_dump "$DATABASE_URL" > /tmp/pre-pivot.sql` (path outside the repo).
- [ ] **Step 2:** Edit the schema files as listed.
- [ ] **Step 3:** Run `npx prisma migrate dev --name remove-contests-and-leagues`; expected: one new folder in `prisma/migrations/`, client regenerated in `src/generated/prisma/`. Do not edit the SQL.
- [ ] **Step 4:** Delete seed users first if the migration complains about FK order: the migration must drop dependents before parents (Prisma orders this itself; if it fails, fix the schema relations, do not hand-edit SQL).
- [ ] **Step 5:** `npx tsc --noEmit`, `npm test`, `npm run build` all green.
- [ ] **Step 6:** Commit `feat: drop contest and league tables`.

## Task 5: Baseball Savant client

**Files:**
- Create: `server/providers/savant/savant.client.ts`, `savant.mapper.ts`, `savant.type.ts`, `savant.const.ts`, `server/providers/dto/provider-expected-stats.dto.ts`
- Test: `server/providers/savant/__tests__/savant.mapper.test.ts`

**Interfaces:**
- Produces:
  - `interface ProviderExpectedStats { externalPlayerId: number; season: number; role: 'batter' | 'pitcher'; xba: number | null; xslg: number | null; xwoba: number | null; barrelRate: number | null; hardHitRate: number | null; sprintSpeed: number | null }`
  - `fetchSavantExpectedStats(season: number, role: 'batter' | 'pitcher'): Promise<ProviderExpectedStats[]>` — GET `https://baseballsavant.mlb.com/leaderboard/custom?year={season}&type={role}&min=1&selections=xba,xslg,xwoba,barrel_batted_rate,hard_hit_percent,sprint_speed&csv=true`, `fetch` with `next: { revalidate: 86400 }`, same error mapping as `mlbFetch` (`ProviderUnavailableError`, `ProviderError`).
  - `mapSavantCsvToExpectedStats(csv: string, season: number, role: 'batter' | 'pitcher'): ProviderExpectedStats[]`
- Cache: Next fetch revalidate (as `mlbFetch` does). `ApiCacheEntry` is unused anywhere in the code, so it is not introduced here (deliberate deviation from the spec's wording).

- [ ] **Step 1:** Write failing tests in `savant.mapper.test.ts`: `parses BOM and quoted names` (input starts with `﻿"last_name, first_name","player_id",...` and a row `"Lowe, Nathaniel",663993,2025,".229",".373",".303",7,41.5,"26.2"` → `externalPlayerId 663993`, `xba 0.229`, `barrelRate 7`, `sprintSpeed 26.2`); `empty value becomes null`; `throws ProviderError when player_id header missing`.
- [ ] **Step 2:** Run `npx vitest run server/providers/savant` — FAIL.
- [ ] **Step 3:** Implement mapper with a small RFC-4180 line parser (no new dependency); implement client.
- [ ] **Step 4:** Run tests — PASS. Commit `feat: add Baseball Savant expected-stats client`.

## Task 6: Richer MLB data (profile, availability, game context)

**Files:**
- Modify: `server/providers/mlb/mlb.provider.ts`, `server/providers/sports-provider.interface.ts`, `server/providers/mlb/types/*`, `server/providers/mlb/mappers/*`, `server/providers/dto/provider-schedule.dto.ts`
- Create: `server/providers/dto/provider-player-profile.dto.ts`, `server/providers/dto/provider-game-context.dto.ts`
- Test: `server/providers/mlb/__tests__/mlb-profile.mapper.test.ts`, `mlb-game-context.mapper.test.ts` (fixtures: trimmed real responses saved under `__tests__/fixtures/`)

**Interfaces:**
- Produces in `provider-player-profile.dto.ts`:
  - `interface ProviderStatSplit { key: 'vsLeft' | 'vsRight' | 'home' | 'away'; stats: Record<string, string | number> }`
  - `interface ProviderGameLogLine { date: string; opponentTeamId: number; stats: Record<string, string | number> }`
  - `interface ProviderStatGroup { season: Record<string, string | number> | null; sabermetrics: Record<string, string | number> | null; splits: ProviderStatSplit[]; gameLog: ProviderGameLogLine[] }`
  - `interface ProviderPlayerProfile { player: ProviderPlayer; hitting: ProviderStatGroup | null; pitching: ProviderStatGroup | null; status: { code: string; description: string; available: boolean } }`
- Produces in `provider-game-context.dto.ts`: `interface ProviderGameContext { game: ProviderScheduledGame; venue: { id: number; name: string } | null; weather: { condition: string; tempF: number | null; wind: string } | null; probablePitchers: { home: ProviderPlayer | null; away: ProviderPlayer | null }; lineupsPosted: boolean }`
- Interface additions to `ISportsProvider`: `getPlayerProfile(id: number, season: number): Promise<ProviderPlayerProfile | null>`; `getGameContexts(filters: GetScheduleFilters): Promise<ProviderGameContext[]>`.
- Source calls (verified against the live API): `/people/{id}?hydrate=stats(group=[hitting,pitching],type=[season,sabermetrics,statSplits,gameLog],sitCodes=[vl,vr,h,a],season={season})` and `/schedule?...&hydrate=probablePitcher,weather,venue,lineups`. Availability comes from `/people/{id}` roster `status` plus `transactions`; the non-existent `/injuries` endpoint is not used.

- [ ] **Step 1:** Save one real response of each shape as a fixture; write failing mapper tests: `maps vl/vr/h/a splits to keys`, `returns both hitting and pitching groups for a two-way player` (fixture: Ohtani, id 660271), `player with no stats yields null groups, not empty zeros`, `weather null when absent`, `probable pitcher null when not announced`.
- [ ] **Step 2:** Run `npx vitest run server/providers/mlb` — FAIL.
- [ ] **Step 3:** Implement mappers (pure) and provider methods using `mlbFetch` (profile revalidate 900s, schedule contexts 300s).
- [ ] **Step 4:** Tests PASS; `tsc` clean. Commit `feat: load splits, game logs, weather and probable pitchers from MLB`.

## Task 7: Estimate functions (pure)

**Files:**
- Create: `src/shared/estimates/{index.ts,estimates.type.ts}`, `server/services/estimates/{estimates.const.ts,game-estimate.ts,player-outlook.ts}`
- Test: `server/services/estimates/__tests__/game-estimate.test.ts`, `player-outlook.test.ts`

**Interfaces:**
- Produces (`estimates.type.ts`): `type Confidence = 'low' | 'medium' | 'high'`; `interface EstimateFactor { key: 'team_strength' | 'home_field' | 'starter' | 'form' | 'park_weather' | 'platoon' | 'expected_stats'; label: string; effect: number }`; `interface GameEstimate { gamePk: number; homeWinProbability: number; confidence: Confidence; factors: EstimateFactor[] }`; `interface PlayerOutlook { externalPlayerId: number; score: number | null; confidence: Confidence; factors: EstimateFactor[] }`
- `estimateGame(input: { gamePk: number; home: TeamStrength; away: TeamStrength; homeStarter: StarterStrength | null; awayStarter: StarterStrength | null; weather: ProviderGameContext['weather'] }): GameEstimate`, where `TeamStrength = { winPct: number; last10WinPct: number }` and `StarterStrength = { era: number; inningsPitched: number }`.
- `outlookForPlayer(input: { profile: ProviderPlayerProfile; expected: ProviderExpectedStats | null; opposingStarterThrows: 'L' | 'R' | null }): PlayerOutlook`.
- All weights live in `estimates.const.ts` (log5 base, `HOME_FIELD = 0.04`, starter ERA weight `0.02` per run clamped to ±0.08, form window sizes 7/14/30). Starter "known" means `inningsPitched >= 30`.

- [ ] **Step 1:** Failing tests for `estimateGame`: `equal teams, no starters → home 0.54 confidence low`; `home .600 vs away .400 → home above 0.54`; `ace vs replacement starter moves probability toward the ace's side by at most 0.08`; `missing probable pitcher → returns estimate, confidence low`; `probability always within [0.05, 0.95]`.
- [ ] **Step 2:** Failing tests for `outlookForPlayer`: `no plate appearances and no innings → score null, confidence low`; `hot last-14 form raises score vs identical season line`; `platoon: batter weak vs L facing a left-handed starter lowers score`.
- [ ] **Step 3:** Run — FAIL. Implement both functions (log5: `a(1-b) / (a(1-b)+b(1-a))`, then add home field and starter adjustment, clamp). Score is 0–100.
- [ ] **Step 4:** Tests PASS. Commit `feat: add deterministic game estimate and player outlook`.

## Task 8: Read APIs (analytics, compare, games hub)

**Files:**
- Create: `server/services/analytics/analytics.service.ts` (+ interface), `server/controllers/analytics/analytics.controller.ts` (+ interface), `server/entities/analytics/analytics.schema.ts`, routes `src/app/api/players/[id]/analytics/route.ts`, `src/app/api/players/compare/route.ts`, `src/app/api/games/[gamePk]/route.ts`
- Modify: `server/services/games/games.service.ts`, `src/app/api/games/upcoming/route.ts` (now returns estimates), `src/shared/games/types.ts`
- Test: `server/services/analytics/__tests__/analytics.service.test.ts`, `server/entities/analytics/analytics.schema.test.ts`

**Interfaces:**
- Produces (shared types in `src/shared/analytics/`): `PlayerAnalytics { profile: ProviderPlayerProfile-as-domain; expected: ExpectedStats | null; outlook: PlayerOutlook }`; `CompareResult { players: PlayerAnalytics[] }`; `GameDetail { game: UpcomingGameRecord; venue, weather, probablePitchers, lineupsPosted; estimate: GameEstimate }`; `UpcomingGameRecord` gains `estimate: GameEstimate | null`.
- Endpoints: `GET /api/players/{id}/analytics?season=`; `GET /api/players/compare?ids=1,2,3` (2–4 ids, schema `compareQuerySchema` rejects <2 or >4 or non-numeric); `GET /api/games/{gamePk}`.
- Services consume `ISportsProvider`, `fetchSavantExpectedStats`, `estimateGame`, `outlookForPlayer`. A missing Savant row yields `expected: null`, not an error.

- [ ] **Step 1:** Failing tests: `compare schema rejects one id`, `rejects five ids`, `analytics service returns outlook with score null for a player without stats`, `analytics service returns expected null when Savant has no row`, `upcoming games carry estimate only for SCHEDULED games`.
- [ ] **Step 2:** Run — FAIL. Implement services, controllers, schemas and routes following `server.md` (GET handlers pass primitives).
- [ ] **Step 3:** Tests PASS; `tsc` clean. Commit `feat: add player analytics, compare and game detail APIs`.

## Task 9: Players page with analytics

**Files:**
- Create: `src/entities/analytics/{api,model}/…` (`fetchPlayerAnalytics`, `useAnalyticsData`), `src/widgets/players/ui/player-analytics-panel.tsx`, `src/widgets/players/model/use-player-analytics.ts`
- Modify: `src/widgets/players/ui/player-detail-drawer.tsx` (renders the panel), `src/widgets/players/index.ts`
- Test: `src/widgets/players/model/__tests__/use-player-analytics.test.ts`

**Interfaces:**
- Consumes: `GET /api/players/{id}/analytics` (Task 8). Hook `usePlayerAnalytics(id: number | null)` returns `{ analytics, isLoading, error }` with `error: ApiError | undefined`.
- Panel sections: season line, last 7/14/30 form, splits (vs L/R, home/away), expected vs actual, availability status, outlook score with its factors. `null` values render as "—".

- [ ] **Step 1:** Failing hook tests: `returns null analytics while id is null (no request)`, `exposes ApiError on failure`.
- [ ] **Step 2:** Run — FAIL. Implement fetcher (wrapped in `withErrorHandling`, mapper inside), SWR hook, hook, panel. Use the `frontend-design` skill for the panel layout.
- [ ] **Step 3:** Tests PASS. Verify in the browser pane: open `/players`, open a player drawer, confirm sections render and a player with no stats shows "—". Commit `feat: show player analytics in the players drawer`.

## Task 10: Compare tool

**Files:**
- Create: `src/app/(app)/compare/page.tsx`, `src/views/compare/compare-view.tsx`, `src/widgets/compare/{index.ts,model/use-compare.ts,ui/compare-table.tsx,ui/compare-picker.tsx}`, `src/entities/analytics/api/fetch-compare.ts`
- Modify: `src/widgets/players/ui/player-row.tsx` ("Add to compare" action)
- Test: `src/widgets/compare/model/__tests__/use-compare.test.ts`

**Interfaces:**
- `useCompare()` returns `{ selectedIds: number[]; add(id: number): void; remove(id: number): void; result: CompareResult | undefined; isLoading; error: ApiError | undefined }`. Selection lives in the URL query `?ids=` so it is shareable; max 4, min 2 to fetch; adding a fifth is ignored.
- Table: one column per player, rows = season line, form, splits, xStats, outlook; best value per row highlighted; `null` shows "—" and never wins a row.

- [ ] **Step 1:** Failing tests: `ignores a fifth player`, `does not fetch with fewer than two ids`, `null stat never marked as best in a row`.
- [ ] **Step 2:** Run — FAIL; implement; tests PASS.
- [ ] **Step 3:** Browser check of `/compare?ids=660271,592450`. Commit `feat: add player compare tool`.

## Task 11: Games hub

**Files:**
- Create: `src/app/(app)/games/page.tsx`, `src/app/(app)/games/[gamePk]/page.tsx`, `src/views/games/{games-view.tsx,game-detail-view.tsx}`, `src/widgets/games/{index.ts,model/use-upcoming-games.ts,model/use-game-detail.ts,ui/game-card.tsx,ui/estimate-meter.tsx,ui/game-detail-panel.tsx}`, `src/entities/games/api/{fetch-upcoming-games.ts,fetch-game-detail.ts}`
- Modify: `src/widgets/dashboard/ui/next-games.tsx` (reuse `GameCard` via the widget's public API only if layers allow; otherwise keep it separate)

**Interfaces:**
- Consumes: `GET /api/games/upcoming`, `GET /api/games/{gamePk}`.
- `EstimateMeter` shows "Estimate: Home 56%" with confidence badge and the factor list; footer text: "Statistical estimate for fantasy decisions. Not betting advice." Game detail has a slot for the AI picks button (wired in Task 13).

- [ ] **Step 1:** Failing tests for `use-upcoming-games`: `groups games by local date`, `estimate meter rounds to whole percent` (pure formatter `formatEstimate(p: number): string`, `0.564 → "56%"`).
- [ ] **Step 2:** Run — FAIL; implement; PASS.
- [ ] **Step 3:** Browser check of `/games` and a game detail. Commit `feat: add upcoming games hub with outcome estimates`.

## Task 12: Team builder as a saved-draft tool

**Files:**
- Modify: `prisma/schema/fantasy-team.prisma` (add `platform FantasyPlatform @default(OTHER)`, `scoringPreset ScoringPreset @default(POINTS)`; enums `FantasyPlatform { YAHOO ESPN OTHER }`, `ScoringPreset { POINTS CATEGORIES_5X5 }`), `server/entities/me/me.schema.ts` (create/update accept both), `server/repositories/fantasy-team/*`, `server/services/me/me.service.ts`, `src/shared/team-builder/types.ts`, `src/widgets/team-builder/ui/{save-bar.tsx,team-builder-subbar.tsx}` (platform and preset selectors), `src/widgets/my-teams/*`
- Test: `server/entities/__tests__/me-team.schema.test.ts`, extend `src/widgets/team-builder/model/__tests__/team-builder-roster.test.ts`

**Interfaces:**
- `CreateTeamPayload` gains `platform: 'YAHOO' | 'ESPN' | 'OTHER'` and `scoringPreset: 'POINTS' | 'CATEGORIES_5X5'`; `Team` gains the same two fields. Existing roster rules, salary budget and captain mechanics stay unchanged in this plan (see "Not covered").

- [ ] **Step 1:** Failing schema tests: `defaults to OTHER and POINTS`, `rejects an unknown platform`.
- [ ] **Step 2:** Edit schema, run `npx prisma migrate dev --name fantasy-team-add-platform-and-preset`; implement through repository/service/UI.
- [ ] **Step 3:** `tsc`, `npm test`, browser check creating a team with a platform. Commit `feat: save fantasy teams with platform and scoring preset`.

## Task 13: Per-game AI advice with credits

**Files:**
- Create: `server/services/ai/features/game-picks.feature.ts`, `server/services/ai/prompts/game-picks.prompt.ts`, `src/app/api/me/ai/game-picks/route.ts`, `src/features/game-picks/{index.ts,api/fetch-game-picks.ts,model/use-game-picks.ts,ui/game-picks-button.tsx,ui/game-picks-result.tsx}`
- Modify: `server/services/ai/types.ts` (add `GAME_PICKS: 'game_picks'`; remove `LINEUP_OPTIMIZER`), `server/services/ai/features/matchup-predictor.feature.ts` (prompt receives the deterministic `GameEstimate`; model may not change the number, only explain), `prisma/seed.ts` (upsert `game_picks` with the old lineup optimizer's cost; set `isActive: false` for `lineup_optimizer`), delete `lineup-optimizer.*` and its tests
- Test: `server/services/ai/__tests__/features/game-picks.test.ts`, `server/services/ai/__tests__/ai-billing.service.test.ts` (extend)

**Interfaces:**
- Input: `{ gamePk: number; teamId?: string }` (optional saved team to optimise around). Output (zod `gamePicksOutputSchema`): `{ gamePk: number; picks: { externalPlayerId: number; playerName: string; role: 'start' | 'sit' | 'watch'; reason: string }[]; summary: string }` with at least one pick.
- Prompt input always includes the computed `GameEstimate` and each candidate's `PlayerOutlook`; picks may only reference `externalPlayerId`s that appear in the supplied candidates (output validator rejects others).
- UI shows the credit cost and the user's balance before confirm; the call is disabled when balance < cost.

- [ ] **Step 1:** Failing tests: `rejects output referencing a player outside the candidates`, `insufficient credits → AI provider never called and no ledger row written`, `provider failure after reservation marks usage FAILED and refunds` (extend billing tests to the new key).
- [ ] **Step 2:** Run — FAIL. Implement feature, prompt, route (POST parses `request.json()`), SWR mutation hook, UI.
- [ ] **Step 3:** Tests PASS; `npx prisma db seed` locally; browser check with a funded and an unfunded user. Commit `feat: add credit-paid AI picks for a game`.

## Task 14: Copy, legal and leftover sweep

**Files:**
- Modify: `src/widgets/landing/**`, `src/widgets/legal/**`, `src/app/legal/{terms,pricing,refunds,privacy}/page.tsx`, `src/app/services/page.tsx`, `src/app/sitemap.ts`, `README`-level docs (`PROJECT-BRIEFING.md`, `todo.md`), `docs/architecture.md` only if it mentions removed slices
- Delete: `docs/showcase/`

- [ ] **Step 1:** Rewrite landing, services and legal copy to describe a fantasy research assistant (free tools, credit-paid AI, no contests, no prizes, not betting advice). Pricing page lists credit packs and AI feature costs read from the existing pricing source, not hard-coded.
- [ ] **Step 2:** `git grep -niE "tournament|contest|league standings|prize|winnings|entry fee|showcase|leaderboard" -- src server prisma/seed.ts docs/*.md PROJECT-BRIEFING.md todo.md`; expected: no hits except the legacy ledger labels from Task 3 and migration history.
- [ ] **Step 3:** `npm run build`, `npm test`, `npx tsc --noEmit` all green; browser walk of landing → sign-in → players → compare → games → game detail → AI picks → wallet.
- [ ] **Step 4:** Commit `docs: reposition product copy and legal pages as a fantasy assistant`.

## Not covered by this plan

- Salary cap, budget meter and captain multiplier in the team builder are contest-style mechanics that this plan leaves untouched; decide separately whether to keep them as optional platform presets.
- Applying the drop-tables migration to production; backing up production; the payment gateway re-review.
- Non-MLB leagues and any Yahoo/ESPN account sync.
