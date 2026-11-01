# Daily baseball showcase — approved design

Approved in chat on 2026-11-01: use the first “Play every day” layout.

## Purpose

A working product showcase for prospective buyers, with an explicitly identified
demo community. Baseball only; no paid sports APIs, scraping or other sports in v1.
Existing real accounts, payments and weekly tournament history must survive.

## Daily Classic

Free entry; one lineup per account per contest. Nine slots P, C, 1B, 2B, 3B,
SS, LF, CF, RF; three OF-eligible outfielders; salary cap 80,000; optional
captain multiplier 1.5. Canonical server-owned pool and salary
`4000 + (externalPlayerId % 7) * 1000`. Immutable snapshots at lock.
Use existing baseball scoring math, not synthetic point totals.

Live calendars use America/New_York days and UTC timestamps, published three
days ahead for MLB, Triple-A and Double-A where full scoring data exists.
Lock at earliest included game. Do not publish impossible/incomplete lineups.

Replay has a separate catalogue and ranking. Import 30 verified MLB days from
2025, preserving original dates and historical teams/positions. Daily Replay
locks at 19:00 UTC. Show source date and Replay label. No invented live games.

Missing statistics stay provisional. Shared game snapshots avoid per-user
provider calls. Postponed games wait 72 hours after original start; unplayed
games then void. All-void contests cancel without ranking effect. Ties rank
1,1,3, stable ordering by ID.

## Demo community

30,000 persistent identities from RandomUser 1.4, stable seed, name/nat only;
batched prevalidated manifest, idempotent import. Update positively identified
legacy demo users while preserving IDs and relations; skip protected roles and
accounts with payments. Newly generated accounts have no login credentials.
DiceBear 10.x notionists, stable identity seed; local generation for commercial
use, public HTTP API only for noncommercial preview.

30 days of Replay history, approximately 1,500 distinct demo participants per
day, rotation covering the cohort. Balanced, pitcher-focused and risky
strategies choose valid differing lineups. Persist joined, edited, locked,
completed and ranking movement events. Never randomize counts/ratings on read.
Distinguish demo and real activity; count active managers from actual entries.

## Presentation

English UI and existing product header/theme. Daily contests primary; game
results above; manager ranking and activity adjacent. New and returning users
both see the community; compact onboarding remains. Compact landing preview.
Routes /contests, /contests/[id], /managers, /managers/[id]. Reuse builder UI
with daily-specific state; allow inspection of completed lineups and history.
Hide opponents' lineups before lock. Never expose contact/authentication fields.

## Operation

SHOWCASE_ENABLED defaults false. Daily cron and authenticated 60-second visible
page refresh drive a bounded 20-second worker with shared lease and resumable
cursor. All loops idempotent. No arbitrary client-supplied clock.
Stage isolated DB migration, seed dry-run, real data import, history, browser
QA, then enable. Disable hides features/stops worker but preserves all data.

## Review focus

Idempotent seed preserving relationships; concurrent lock-boundary submissions;
missing provider data; Replay date provenance/DST; public profile and lineup
privacy. Existing weekly scoring must continue passing tests.
