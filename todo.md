# TODO

## Payments

- [ ] **Turn on receipt emails.** The code is ready (`server/services/payment/receipt-email.ts`, called from `PaymentService` after a successful payment) and sends over SMTP with nodemailer, like the other projects. Set these variables in the environment (Vercel and `.env`):
  - `SMTP_HOST`, `SMTP_PORT` (default 465), `SMTP_SECURE` (default `true`), `SMTP_USER`, `SMTP_PASS`
  - `EMAIL_FROM` (sender address, defaults to `SMTP_USER`) and `EMAIL_FROM_NAME` (defaults to `BaseballFantasy`)
  - Until `SMTP_HOST`, `SMTP_USER` and `SMTP_PASS` are all set, a receipt is only written to the server log (`[receipt] SMTP is not configured`).
  - The card-acceptance review requires the receipt to show amount and currency, merchant name and URL, date, a unique transaction ID and a link to the Refund & Return Policy. The template already does.
  - Check it once with a real test payment or by calling the mailer from a script before relying on it.
