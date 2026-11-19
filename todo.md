# TODO

## Payments

- [ ] **Turn on receipt emails.** The code is ready (`server/services/payment/receipt-email.ts`, called from `PaymentService` after a successful payment) and sends over SMTP with nodemailer, like the other projects. Set these variables in the environment (Vercel and `.env`):
  - `SMTP_HOST`, `SMTP_PORT` (default 465), `SMTP_SECURE` (default `true`), `SMTP_USER`, `SMTP_PASS`
  - `EMAIL_FROM` (sender address, defaults to `SMTP_USER`) and `EMAIL_FROM_NAME` (defaults to `BaseballFantasy`)
  - Until `SMTP_HOST`, `SMTP_USER` and `SMTP_PASS` are all set, a receipt is only written to the server log (`[receipt] SMTP is not configured`).
  - The card-acceptance review requires the receipt to show amount and currency, merchant name and URL, date, a unique transaction ID and a link to the Refund & Return Policy. The template already does.
  - Check it once with a real test payment or by calling the mailer from a script before relying on it.

## Product pivot (fantasy assistant)

- [ ] **Apply the migrations to production, after a backup.** `remove_contests_and_leagues` drops the contest, league, scoring and showcase tables and the `FantasyTeam.format`, `FantasyTeam.totalScore`, `FantasyTeam.leagueMemberId` and `RosterSlot.scoreContribution` columns; `fantasy_team_add_platform_and_preset` adds platform and scoring preset. They were only run on the local test database. After deploying, run `npx prisma db seed` once: it removes the old `@seed.local` and demo users, adds the `game_picks` AI feature and deactivates `lineup_optimizer` and `matchup_predictor`.
- [ ] **Ask the payment gateway whether the new description needs a re-review.** The product was reviewed as contests with prizes; it is now a research assistant with paid AI features. Terms, Privacy, Refunds, Cookies, Services and the landing page were rewritten, but have not been reviewed by a lawyer. Please do that before launch.
- [ ] **Smoke-test AI picks with a real `OPENAI_API_KEY` once MLB games are scheduled** (spring). The paid success path was not run end to end: there is no key in the test setup and no scheduled games in the off-season.
- [ ] Remove `SHOWCASE_ENABLED` and any remaining cron settings from the deployment environment; the app no longer reads them.
- [ ] Decide whether to keep the salary cap, budget meter and captain multiplier in the team builder. They are contest-style mechanics that were left untouched.
- [ ] Before running `prisma db seed` in production, check that no real account has `provider = 'demo'`: the seed deletes those users and their ledger rows along with the old `@seed.local` accounts.
- [ ] Optional: park factors for the game estimate and player outlook (no free source is wired in yet), and loading both Statcast roles for two-way players.
