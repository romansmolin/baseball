# TODO

## Payments

- [ ] **Turn on receipt emails.** The code is ready (`server/services/payment/receipt-email.ts`, called from `PaymentService` after a successful payment) and sends over SMTP with nodemailer, like the other projects. Set these variables in the environment (Vercel and `.env`):
  - `SMTP_HOST`, `SMTP_PORT` (default 465), `SMTP_SECURE` (default `true`), `SMTP_USER`, `SMTP_PASS`
  - `EMAIL_FROM` (sender address, defaults to `SMTP_USER`) and `EMAIL_FROM_NAME` (defaults to `BaseballFantasy`)
  - Until `SMTP_HOST`, `SMTP_USER` and `SMTP_PASS` are all set, a receipt is only written to the server log (`[receipt] SMTP is not configured`).
  - The card-acceptance review requires the receipt to show amount and currency, merchant name and URL, date, a unique transaction ID and a link to the Refund & Return Policy. The template already does.
  - Check it once with a real test payment or by calling the mailer from a script before relying on it.

## Product pivot (fantasy assistant)

- [ ] **Apply the migrations to production, after a backup.** `remove_contests_and_leagues` drops the contest, league, scoring and showcase tables and the `FantasyTeam.format`, `FantasyTeam.totalScore`, `FantasyTeam.leagueMemberId` and `RosterSlot.scoreContribution` columns; `fantasy_team_add_platform_and_preset` adds platform and scoring preset. They were only run on the local test database. After deploying, run `npx prisma db seed` once: it removes the old `@seed.local` and demo users, adds the `game_analysis` and `performer_analytics` AI features and deactivates `lineup_optimizer`, `matchup_predictor` and `game_picks`.
- [ ] **Ask the payment gateway whether the new description needs a re-review.** The product was reviewed as contests with prizes; it is now a research assistant with paid AI features. Terms, Privacy, Refunds, Cookies, Services and the landing page were rewritten, but have not been reviewed by a lawyer. Please do that before launch.
- [ ] **Smoke-test AI picks with a real `OPENAI_API_KEY` once MLB games are scheduled** (spring). The paid success path was not run end to end: there is no key in the test setup and no scheduled games in the off-season.
- [ ] Remove `SHOWCASE_ENABLED` and any remaining cron settings from the deployment environment; the app no longer reads them.
- [x] Salary cap, budget meter: Points formats have no cap now (`salaryCap` is null); the captain multiplier is left as it was.
- [ ] Before running `prisma db seed` in production, check that no real account has `provider = 'demo'`: the seed deletes those users and their ledger rows along with the old `@seed.local` accounts.
- [ ] Optional: park factors for the game estimate and player outlook (no free source is wired in yet), and loading both Statcast roles for two-way players.

## Format builder (stages after H2H Points)

- [ ] Apply the `fantasy_team_add_format_settings` and `fantasy_team_add_categories` migrations to production. It adds format, forecast period, lineup changes, scoring rules, slot config and salary cap to `FantasyTeam`, `slotIndex` to `RosterSlot`, and makes `salaryAtLock` nullable. Old teams read as H2H Points with the default rules and the 9-slot lineup.
- [x] H2H Categories and Roto are in (stage 2): per-category forecasts, z-values against the pool, need-weighted AI picks. Roto is season horizon plus balance only.
- [ ] Roto: make it standings-aware (expected places gained per category) once a league table is available in the product.
- [ ] DFS (deferred by decision until the season, when it can be checked on a real slate): import the official contest CSV (DraftKings format plus a generic `Name, Position, Team, Salary` CSV), pool and salaries from it, slots/cap/scoring preset (DK Classic: P×2 C 1B 2B 3B SS OF×3, $50,000), multi-position players, slate stored with the team. The optimizer already supports a salary cap.
- [ ] Drop the unused `FantasyTeam.scoringPreset` column and the `SCORING_PRESETS` exports (superseded by `format`).
- [ ] Smoke-test Generate with AI with a real `OPENAI_API_KEY` end to end (the explanation call is the only model use now).
- [ ] Projections: park factors, platoon splits, and exact probable-pitcher starts beyond the week window.
