# Event payouts: Stripe Connect and Razorpay Route

Ticket money for `paymentMode = PLATFORM` currently lands on the **platform** Stripe / Razorpay balance. Platform fees (`PLATFORM_FEE_PERCENT`: PRO 2%, ENTERPRISE 1%) are computed in checkout and never applied. Org subscription billing (`stripeCustomerId` / `razorpayCustomerId`) is unchanged and stays on the platform account.

This work splits ticket proceeds: host org receives `amount - fee`, CorpConnect keeps the fee.

| Phase | Provider | Currency | PSP product |
|---|---|---|---|
| **1** (this slice) | Stripe | USD | Connect (Express) + destination charges |
| **2** (later) | Razorpay | INR | Route (linked accounts + order transfers) |

Do not reuse customer ids as seller accounts. Connect / Route ids are separate columns.

Refunds (`PROCESS_REFUND`) and event-form `paymentMode` UI are follow-ups, not required to land destination charges.

---

## Phase 1 — Stripe Connect (USD)

### Goal

A verified, paid-plan org completes Express onboarding. USD PLATFORM checkout uses:

```ts
payment_intent_data: {
  application_fee_amount: platformFee,
  transfer_data: { destination: org.stripeConnectedAccountId },
}
```

Checkout must refuse Stripe tickets if `stripeChargesEnabled` is false.

### Architecture

```
OWNER/ADMIN ──► POST /api/billing/connect/onboard
                    stripe.accounts.create (Express)
                    stripe.accountLinks.create
                    ──► Stripe hosted KYC
                    return / refresh ──► /billing

Stripe webhook ──► account.updated / account.application.deauthorized
                    ──► handleBillingEvent
                    ──► Organization Connect flags

Attendee ──► POST /api/events/[id]/checkout (USD)
                    destination charge + application fee
```

Subscriptions continue to use `stripe.customers` + Checkout `mode: subscription`. Connect is tickets only.

### Schema

`Organization`:

- `stripeConnectedAccountId` (`acct_…`, unique, nullable)
- `stripeChargesEnabled` / `stripePayoutsEnabled` / `stripeDetailsSubmitted` (booleans, default false)

`EventPayment` (audit):

- `applicationFeeAmount` (int, nullable)
- `destinationAccountId` (string, nullable)

### Domain

- Stripe adapter: create Express account, Account Link, retrieve account, Express login link.
- Normalize `account.updated` and `account.application.deauthorized` in `verifyWebhook`.
- `handleBillingEvent` persists flags; deauthorize clears the connected account.
- Service: onboard, sync-on-return, dashboard login link. OWNER/ADMIN only (same as other billing).
- Country: ISO-2 from KYB jurisdiction when present, else `US`. Immutable on the Stripe account after create.

### HTTP

| Method | Path | Result |
|---|---|---|
| `POST` | `/api/billing/connect/onboard` | `{ url }` Account Link |
| `POST` | `/api/billing/connect/sync` | persist retrieve() after return |
| `POST` | `/api/billing/connect/dashboard` | `{ url }` Express login link |
| existing | `/api/webhooks/stripe` | also Connect events |

### UI

Billing page card: not connected / pending KYC / ready to receive USD payouts. CTA: Start Stripe onboarding, Complete onboarding, Open Stripe dashboard.

Query `?connect=return` triggers sync; `?connect=refresh` starts a new Account Link.

### Gates

- Stripe checkout: require `stripeConnectedAccountId` + `stripeChargesEnabled`.
- Create/update event: `paymentMode = PLATFORM` and `currency = USD` requires the same.
- Existing paid-plan and `isVerified` gates stay.

### Stripe Dashboard

Enable Connect (Express). On the platform webhook, add:

- `account.updated`
- `account.application.deauthorized`

Same `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`. No extra env required for Account Links.

### Out of scope (Phase 1)

- Razorpay Route
- `PROCESS_REFUND` / `charge.refunded`
- EventsForm `paymentMode` controls
- Stripe Connect for INR (INR stays Razorpay)

---

## Phase 2 — Razorpay Route (INR)

### Goal

Same split for INR PLATFORM tickets via **Razorpay Route**. Checkout already sketches it:

```ts
transfers: [{
  account: org.razorpayLinkedAccountId,
  amount: amountPaise - platformFee,
  currency: "INR",
}]
```

`razorpayCustomerId` remains the subscription customer.

### Schema (Phase 2)

- `razorpayLinkedAccountId` (`acc_…`)
- KYC / activation flags for the linked account
- Optional transfer id on `EventPayment`

### Domain / HTTP / UI

- Create linked account + complete Razorpay KYC (PAN, bank, IFSC; GST when required).
- Extend `razorpayIdempotentPost` beyond `/customers` | `/subscriptions` | `/orders`.
- Enable Route on the Razorpay business account (product, not an env flag).
- Billing card: “Receive INR payouts”.
- Webhooks: `transfer.processed`, `transfer.failed`, linked-account/KYC, later `refund.processed` (today ignored).
- Gate PLATFORM + INR on a live linked account.
- Refunds: payment refund **and** transfer reversal.

### Out of scope until Phase 2

- Razorpay hosted portal (already 400)
- Using Route for org subscriptions

---

## Shared follow-ups (either phase)

- Implement `PROCESS_REFUND` (Stripe destination refund + `refund_application_fee`; Razorpay reverse transfer).
- Wire `paymentMode` / `externalPayUrl` in EventsForm.
- Terms/ToS: marketplace merchant-of-record language for tickets vs non-refundable subscriptions.
- Billing revenue: show gross vs platform fee vs org payout.

---

## Verification (Phase 1)

```bash
npx jest __tests__/billing-gateway.test.ts __tests__/billing-webhooks.test.ts __tests__/event-checkout.test.ts __tests__/billing-connect.test.ts --no-coverage
```

Manual:

1. Stripe test mode, Connect enabled, webhook forwarding including Connect events.
2. Org OWNER opens Billing → Start Stripe onboarding → complete Express test KYC.
3. Flags: `charges_enabled` true after `account.updated` or return-url sync.
4. USD PLATFORM checkout: PaymentIntent has application fee and `transfer_data.destination`.
5. Checkout without onboarding returns 409.
6. Subscription Checkout / Customer Portal still work on `stripeCustomerId`.
