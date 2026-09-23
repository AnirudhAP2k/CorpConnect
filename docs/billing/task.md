# Event payouts — tasks

Plan: [implementation_plan.md](./implementation_plan.md)

`stripeCustomerId` / `razorpayCustomerId` = org as CorpConnect subscriber. Seller payouts use Connect / Route ids only.

---

## Phase 1 — Stripe Connect (USD)

### Schema
- [x] `Organization.stripeConnectedAccountId` (unique, nullable)
- [x] `Organization.stripeChargesEnabled` / `stripePayoutsEnabled` / `stripeDetailsSubmitted`
- [x] `EventPayment.applicationFeeAmount` / `destinationAccountId`
- [x] Prisma migration `20260923160000_stripe_connect`

### Stripe adapter + webhooks
- [x] Create Express connected account (`metadata.orgId`)
- [x] Account Links (onboarding refresh/return → `/billing`)
- [x] Retrieve account + Express login link
- [x] Normalize `account.updated` and `account.application.deauthorized`
- [x] `handleBillingEvent` persists / clears Connect flags
- [x] Keep ignoring `charge.refunded`

### App services + HTTP
- [x] OWNER/ADMIN: onboard, sync, dashboard login
- [x] `POST /api/billing/connect/onboard`
- [x] `POST /api/billing/connect/sync`
- [x] `POST /api/billing/connect/dashboard`
- [x] Billing page payouts card + `?connect=return|refresh`

### Checkout + gates
- [x] Stripe destination charge: `application_fee_amount` + `transfer_data.destination`
- [x] Persist fee + destination on `EventPayment`
- [x] 409 if USD PLATFORM checkout without `charges_enabled`
- [x] Block create/update of USD PLATFORM events until Connect is ready
- [x] Do not change Razorpay order `transfers` (Phase 2)

### Tests + ops
- [x] Adapter: Connect webhook events
- [x] `handleBillingEvent` Connect cases
- [x] Checkout: fee + destination; 409 without Connect
- [x] Connect onboard/sync service tests
- [ ] Stripe Dashboard: enable Connect; webhook listens for Connect events *(ops, not code)*
- [x] `.env.example` note (same secret key; no extra Connect env)

### Phase 1 explicitly skipped
- [ ] `PROCESS_REFUND` / application-fee refunds
- [ ] EventsForm `paymentMode` UI
- [ ] Razorpay Route

---

## Phase 2 — Razorpay Route (INR)

### Schema
- [ ] `Organization.razorpayLinkedAccountId` + KYC/activation flags
- [ ] Optional transfer id on `EventPayment`

### Razorpay + webhooks
- [ ] Enable Route on the Razorpay business account
- [ ] Create linked account + KYC (PAN, bank, IFSC)
- [ ] Order `transfers[]`: `amountPaise - platformFee` to linked account
- [ ] Extend `razorpayIdempotentPost` (accounts / transfers)
- [ ] Handle `transfer.processed` / `transfer.failed` (and KYC events if used)
- [ ] `refund.processed` still later (refunds follow-up)

### App + UI
- [ ] OWNER/ADMIN INR payouts onboarding on billing page
- [ ] Gate PLATFORM + INR until linked account can receive transfers
- [ ] Tests for transfers on order create + 409 without Route

### Phase 2 explicitly skipped
- [ ] Razorpay customer portal
- [ ] Route for subscriptions

---

## Shared follow-ups

- [ ] `PROCESS_REFUND` (Stripe destination + `refund_application_fee`; Razorpay reverse transfer)
- [ ] EventsForm: `paymentMode`, `currency`, `externalPayUrl`
- [ ] Terms: ticket marketplace vs subscription non-refundability
- [ ] Billing revenue: gross vs fee vs org payout
