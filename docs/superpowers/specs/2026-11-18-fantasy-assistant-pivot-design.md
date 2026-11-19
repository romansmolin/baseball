# Pivot: from fantasy platform to fantasy assistant — design

Date: 2026-11-18. Status: awaiting approval.

## Intent and why

The product must not run any competition between its own users. It becomes a helper tool for people who play fantasy baseball on *other* platforms: it helps them judge player stats, compare players, see upcoming games, estimate game outcomes, and — for a chosen game — get AI advice (paid in credits) on which players to put in their fantasy team.

Reason behind the pivot (as stated by the owner): the product should have nothing to do with real contests between players. The owner did not name a legal / payments / positioning trigger; treat it as "remove every contest surface" and see Constraints for what this implies.

## Goals

1. Remove every user-vs-user competition feature, data model and piece of wording.
2. Team builder: build and save "my team" drafts for use on another platform (no entry, no scoring, no prizes).
3. Deep player analytics using the maximum free data available (see Data).
4. Compare tool: 2–4 players side by side, on stats, form, splits, expected stats and upcoming matchups.
5. Upcoming games hub: schedule, probable pitchers, weather, venue, lineups when posted, and an outcome estimate per game.
6. Per-game AI advice: "for this game, which players fit best" — costs credits.

## Non-goals

- Any contest, tournament, league, leaderboard, ranking between users, entry fee, prize pool, payout.
- Linking to Yahoo/ESPN accounts or importing their rosters (maybe later).
- Non-MLB sources (NPB, KBO, LVBP, LMB) in this pivot. Existing league config is left as is; no new work.
- Our own trained ML model. Probabilities come from transparent formulas plus AI explanation.
- Sportsbook odds, betting lines, or betting advice.

## Anti-goals (failure even if it "works")

- Any remaining text or UI that says contest, tournament, league standings, winnings, prize, entry fee.
- Fake precision: a win probability shown to one decimal as if exact. Always show it as an estimate with a confidence label.
- Scraping a source whose terms forbid it.
- Mock screens that look real (current `/leagues` and `/players` are 100% mock — they are deleted or replaced, not kept).

## Constraints

- Architecture rules in `CLAUDE.md` and `docs/` stay in force (FSD, public `index.ts` only, fetchers wrapped in `withErrorHandling`, mappers, server layering, Zod in `server/entities`).
- Prisma changes go through `npx prisma migrate dev --name <change>` only; never hand-edit migrations, never `db push`. The owner authorised making migrations as part of this work.
- Payments, credit ledger and auth stay. Ledger rows are never deleted or rewritten; `CreditTransactionType` enum keeps `TOURNAMENT_ENTRY_FEE` / `TOURNAMENT_WINNINGS` (historical rows reference them) but nothing new writes them.
- The migration that drops contest tables is destructive. Run it on the local DB only. It must NOT be applied to production by me; the owner decides when, after a backup.
- Non-code, owner-side: the payment gateway reviewed the product as "tournaments with prizes". Terms, pricing, refund and privacy pages will be rewritten in this work, but whether the gateway needs a re-review is the owner's call.
- Work happens on `main` (owner-authorised). `main` has 0 commits that `codex/daily-baseball-showcase` lacks, so step 0 is a fast-forward of `main` to that branch. No push.

## Approaches considered

- **A. Cut first, then build (chosen).** One clean removal with migration, then phased new features, each phase leaving build and tests green. Trade-off: the product is thinner between phases.
- B. Build alongside, cut last. Always-working product, but two products in one codebase and the cut tends to never happen.
- C. New project. Cleaner, but throws away AI features, credits, payments, auth.

Data-source options: MLB Stats API only (safest, thinner) / MLB + Baseball Savant CSV (chosen: richest data under one owner and one player ID) / plus FanGraphs and Baseball-Reference scraping (rejected: terms forbid automated collection).

## Decisions

### Data layer (extend `ISportsProvider` and MLB provider)

All keyed by MLB `personId` (= current `externalPlayerId`).

- MLB Stats API (verified reachable, no key): player stat splits (`vl`, `vr`, `h`, `a`), `gameLog`, `sabermetrics`, season stats; schedule with `probablePitcher`, `weather`, `venue`, `lineups`; transactions and roster `status` as the injury / availability signal (there is no `/injuries` endpoint — it returns 404).
- Baseball Savant CSV leaderboards (verified: `expected_statistics` and `custom` return CSV): xBA, xSLG, xwOBA, barrel %, hard-hit %, sprint speed; pitcher equivalents. A small fetcher + mapper turns CSV rows into a domain model. Not HTML scraping.
- All upstream reads cached through the existing `ApiCacheEntry` table with per-source TTL (Savant daily, schedule minutes, game-day data short). Savant requests are rate-limited and cached; no per-user-click fan-out.
- Rule: DTO shapes stay in `api/`, mappers convert to domain models, as the docs require.

### Estimates

- **Game outcome estimate (free, deterministic):** log5-style team strength plus adjustments for probable starter quality and recent form (last 10 games). Park and weather are not inputs: win probability is not symmetric in either, and no park-factor source is wired in (deferred). Returns `{ homeWinProbability, confidence }`. Pure function, unit-tested.
- **Player outlook (free, deterministic):** form (last 14 games vs season; analytics also show 7/14/30-game windows), platoon split vs the opposing starter's handedness, expected stats vs actual (regression signal), and weather for hitters. No park factor yet (deferred). Returns a score and the factors behind it.
- **AI layer (credits):** explains the estimates and recommends players for a specific game. Existing AI features are kept and reworked: `matchup-predictor` becomes "explain the game estimate"; `lineup-optimizer` / `team-builder-autofill` take a game as the target; `player-analysis` and `trade-advisor` stay. AI input includes the deterministic numbers so the model cannot invent them.
- Scoring-format presets used by analytics and the builder: points (generic) and 5x5 category. My call; fantasy platforms differ and v1 should not model every one.

### Free vs paid

Free: players, stats, compare, schedule, deterministic estimates. Paid in credits: every AI call. Existing credit costs in `prisma/seed.ts` stay as the starting point.

### What is removed

- DB: `League`, `LeagueMember`, `LeagueMatchup`, `DailyContest`, `DailyEntry`, `DailyGameSnapshot`, `RecurringTournament`, `ManagerStanding`, `ScoringRule`, `WeeklyScoreCache`, `WeeklyLineup`, `WeeklyLineupSlot`, `ShowcaseJob`, `CommunityEvent`, `DemoProfile`, `ArchivedGameSnapshot`, their enums; `FantasyTeam.leagueMemberId` and `totalScore`. Seed users (`@seed.local`) deleted. Kept: `User`, auth tables, `Payment`, `CreditTransaction`, `AIFeature`, `AIUsageLog`, `FantasyTeam` (as a saved draft) + `RosterSlot`, `ApiCacheEntry`.
- Server: tournaments, daily-contests, leagues, standings, scoring, showcase, recurring-tournaments, weekly-lineup, community, demo-users, games(results), managers, performers services / controllers / routes / entities, and wallet logic for entry fees and winnings.
- Cron: all of `vercel.json` crons for lineups, scoring, tournament status, settling, showcase. Possible new cron: Savant cache warm-up (builder's call).
- Frontend: `contests`, `tournaments`, `leagues`, `managers`, `games` (results), `rules`, `stats` (contest stats), `showcase`, `tournament-progress` widgets / views / routes, `features/tournament-join`, `features/daily-entry`, related entities and mock data; dashboard metrics tied to contests.
- Repo docs: obsolete specs and plans for contests stay in git history; the briefing doc `PROJECT-BRIEFING.md` and `todo.md` are updated.

### Phases (each ends with build + tests green)

0. Fast-forward `main`; cut: remove code, then one `migrate dev` migration dropping the tables; update `vercel.json`, seed, navigation.
1. Data layer: provider extension, Savant fetcher, cache, mappers, tests.
2. Players page (real data, replaces mock), player detail analytics, compare tool.
3. Games hub: upcoming schedule, game detail, deterministic estimates.
4. Team builder rework (saved draft teams, platform label, scoring preset) and per-game AI advice with credits and a cost preview before spending.
5. Landing, terms, pricing, refunds, privacy and navigation copy rewritten for the assistant product; final grep for leftover contest wording.

## Left to the builder

UI layout and visuals of each new screen (use the frontend-design skill); exact stat columns and weights in the estimate formulas (keep them in one constants file, documented); Savant TTLs; whether Savant warm-up is a cron or lazy; naming of the new slices following the FSD naming rules.

## Risks to watch

- Dropping tables loses data permanently; local DB only, owner backs up production first.
- Savant CSV columns can change; the mapper must fail loudly with `ApiError` and tests pin the headers.
- Estimates near betting territory: wording stays "fantasy decision aid", no odds, no wagering language.
