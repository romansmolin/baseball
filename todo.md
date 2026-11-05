# TODO

## Payments

- [ ] **Receipt emails after a successful payment.** The code is ready (`server/services/payment/receipt-email.ts`, called from `PaymentService`), but nothing is sent until a mail service is set up.
  - Create a Resend account and verify the sending domain (`mybaseballfantasy.com`).
  - Set `RESEND_API_KEY` and, if the sender should differ from `BaseballFantasy <billing@mybaseballfantasy.com>`, `RECEIPT_FROM_EMAIL`.
  - Until then a receipt is only written to the server log (`[receipt] RESEND_API_KEY is not set`).
  - The card-acceptance review requires the receipt to show amount and currency, merchant name and URL, date, a unique transaction ID and a link to the Refund & Return Policy. The template already does.
