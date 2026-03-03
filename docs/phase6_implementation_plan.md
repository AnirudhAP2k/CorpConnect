# Phase 6: Payment Gateway Integration

## Background

Two payment scopes:
1. **Org subscriptions** — FREE / PRO / ENTERPRISE plans gating app features (AI, analytics, etc.)
2. **Event payments** — Attendees pay to join paid events hosted by organizations

Dual provider: **Razorpay** (India — UPI, netbanking, cards in INR) + **Stripe** (international — cards, Apple Pay, in any currency). User picks provider at checkout.

---

## Architecture

```
                  ┌─────────────────────────────────────────┐
                  │  Next.js (app)                           │
                  │                                          │
   Org billing ──►│  /api/billing/subscribe   → Stripe/RZP   │
   (plans)        │  /api/billing/portal      → Stripe portal │
                  │  /api/webhooks/stripe     ← Stripe events │
                  │  /api/webhooks/razorpay   ← RZP events    │
                  │                                          │
   Event pay ────►│  /api/events/[id]/checkout              │
                  │    → Stripe Checkout OR Razorpay Order   │
                  │  /api/events/[id]/payment-success        │
                  │    → verify + confirm + notify org webhook│
                  └─────────────────────────────────────────┘
```

### Event Payment Modes

| Mode | `Events.paymentMode` | Flow |
|---|---|---|
| **FREE** | `FREE` | Register instantly, no payment |
| **PLATFORM** | `PLATFORM` | Checkout redirect → verified by webhook → auto-confirm |
| **EXTERNAL** | `EXTERNAL` | Show org's payment link, registration status = `PENDING_PAYMENT`, org manually confirms |

---

## Free Tier Abuse Prevention

Four layers of guardrails to prevent orgs from exploiting the free tier (creating paid events offline while using the platform for free):

### Layer 1 — Paid events require a paid plan *(enforced in API)*
`paymentMode = PLATFORM` or `EXTERNAL` is **blocked at the API level** for FREE tier orgs. The API returns `402` with a clear upgrade prompt. FREE orgs can only create free events.

### Layer 2 — Event & attendee hard limits

| Limit | FREE | PRO | ENTERPRISE |
|---|---|---|---|
| Active public events | **3** | Unlimited | Unlimited |
| Max attendees per event | **50** | 500 | Unlimited |
| Private/invite-only events | Unlimited | Unlimited | Unlimited |

Enforced in `POST /api/events` — query active event count before allowing creation.

### Layer 3 — Platform fee on PLATFORM-mode payments
When using the app's payment gateway, a small platform fee is deducted:
- PRO: **2%** of each event payment
- ENTERPRISE: **1%** of each event payment

Deducted via Stripe/Razorpay transfer amount adjustment at checkout creation time.

### Layer 4 — Verified org gate for paid events
Only `Organization.isVerified = true` orgs can set `paymentMode = PLATFORM` or `EXTERNAL`. Verification is a one-time manual admin action (low friction for legitimate orgs, adds meaningful barrier to abuse).

> [!NOTE]
> `isVerified` already exists on the `Organization` model — no schema change needed for Layer 4.

---

## Proposed Changes

---

### 1. Database Schema

#### [MODIFY] [schema.prisma](file:///d:/evently/prisma/schema.prisma)

**Add to `Organization`:**
```prisma
stripeCustomerId      String?
razorpayCustomerId    String?
subscriptionPlan      SubscriptionPlan  @default(FREE)
subscriptionStatus    SubscriptionStatus @default(ACTIVE)
subscriptionExpiresAt DateTime?
paymentWebhookUrl     String?           // org's own webhook for event payments
preferredCurrency     String            @default("INR")
```

**Add to `Events`:**
```prisma
paymentMode     EventPaymentMode  @default(FREE)
currency        String            @default("INR")
externalPayUrl  String?           // for EXTERNAL mode
```

*Note: `price` (String?) and `isFree` (Boolean) already exist — keep for compatibility, add `paymentMode` as the authoritative field.*

**New model: `OrgSubscription`** — tracks billing history:
```prisma
model OrgSubscription {
  id                   String             @id @default(uuid()) @db.Uuid
  organizationId       String             @db.Uuid
  provider             PaymentProvider    // STRIPE | RAZORPAY
  providerSubscriptionId String           @unique
  plan                 SubscriptionPlan
  status               SubscriptionStatus
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  cancelledAt          DateTime?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  organization         Organization       @relation(...)
}
```

**New model: `EventPayment`** — tracks per-event payments:
```prisma
model EventPayment {
  id               String          @id @default(uuid()) @db.Uuid
  participationId  String          @unique @db.Uuid
  provider         PaymentProvider
  providerPaymentId String         @unique  // Stripe PaymentIntent / RZP order_id
  amount           Int             // in smallest currency unit (paise / cents)
  currency         String
  status           PaymentStatus   @default(PENDING)
  receiptUrl       String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  participation    EventParticipation @relation(...)
}
```

**New enums:**
```prisma
enum PaymentProvider    { STRIPE  RAZORPAY }
enum SubscriptionPlan   { FREE  PRO  ENTERPRISE }
enum SubscriptionStatus { ACTIVE  PAST_DUE  CANCELLED  TRIALING }
enum EventPaymentMode   { FREE  PLATFORM  EXTERNAL }
enum PaymentStatus      { PENDING  SUCCEEDED  FAILED  REFUNDED }
```

**Add to `JobType`:**
```diff
+ SEND_PAYMENT_RECEIPT
+ ORG_WEBHOOK_DELIVERY
+ PROCESS_REFUND
```

---

### 2. Subscription Plans

#### Pricing

| Plan | Price | Features |
|---|---|---|
| FREE | ₹0 | Up to 5 events/mo, no AI, no analytics |
| PRO | ₹2,999/mo or $35/mo | Unlimited events, AI recommendations, org analytics |
| ENTERPRISE | ₹9,999/mo or $120/mo | All PRO + semantic search, API access, priority support |

#### [NEW] [app/api/billing/subscribe/route.ts](file:///d:/evently/app/api/billing/subscribe/route.ts)
`POST { plan, provider }` — creates a Stripe Checkout Session or Razorpay subscription order for the org. Returns a redirect URL.

#### [NEW] [app/api/billing/portal/route.ts](file:///d:/evently/app/api/billing/portal/route.ts)
`POST` — creates a Stripe Customer Portal session for self-serve plan management (upgrade/downgrade/cancel).

#### [NEW] [app/api/billing/status/route.ts](file:///d:/evently/app/api/billing/status/route.ts)
`GET` — returns the org's current plan, status, and next billing date.

---

### 3. Webhook Handlers

#### [NEW] [app/api/webhooks/stripe/route.ts](file:///d:/evently/app/api/webhooks/stripe/route.ts)
Handles:
- `checkout.session.completed` → activate PRO/ENTERPRISE, update `OrgSubscription`
- `invoice.payment_succeeded` → renew subscription
- `invoice.payment_failed` → mark `PAST_DUE`, send warning email
- `customer.subscription.deleted` → downgrade to FREE
- `payment_intent.succeeded` → confirm event registration, enqueue receipt + org webhook

#### [NEW] [app/api/webhooks/razorpay/route.ts](file:///d:/evently/app/api/webhooks/razorpay/route.ts)
Handles:
- `subscription.activated` → same as Stripe checkout.completed
- `subscription.cancelled` → downgrade to FREE
- `payment.captured` → confirm event registration

---

### 4. Event Payment Flow

#### [MODIFY] [app/api/events/[id]/checkout/route.ts](file:///d:/evently/app/api/events/%5Bid%5D/checkout/route.ts)
`POST { provider: "stripe" | "razorpay" }` — creates checkout session for a paid event.
- Checks `paymentMode` → if EXTERNAL, returns `{ mode: "external", url: event.externalPayUrl }`
- If PLATFORM → creates Stripe Checkout or Razorpay Order → returns redirect URL
- If FREE → returns `{ mode: "free" }` (shouldn't be called but safe)

#### [MODIFY] [app/api/events/[id]/participate/route.ts](file:///d:/evently/app/api/events/%5Bid%5D/participate/route.ts)
- FREE events → existing flow unchanged
- PLATFORM events → block direct registration, require payment checkout first
- EXTERNAL events → register with status `PENDING_PAYMENT`, show org payment link

#### [NEW] [app/api/events/[id]/payment-verify/route.ts](file:///d:/evently/app/api/events/%5Bid%5D/payment-verify/route.ts)
`POST { providerPaymentId }` — called after redirect back from checkout. Verifies payment was captured before confirming registration. (Belt-and-suspenders check alongside webhook.)

---

### 5. Org Webhook Delivery

When a platform event payment succeeds:
1. Create `EventPayment` record (status = `SUCCEEDED`)
2. Update `EventParticipation.isPaid = true`, status = `REGISTERED`
3. Send receipt email (job `SEND_PAYMENT_RECEIPT`)
4. If `Organization.paymentWebhookUrl` is set, enqueue `ORG_WEBHOOK_DELIVERY` job which POSTs:
```json
{
  "event": "payment.received",
  "eventId": "...",
  "participationId": "...",
  "amount": 29900,
  "currency": "INR",
  "payerUserId": "...",
  "payerOrgId": "...",
  "timestamp": "..."
}
```

The job runner handles retries (max 3) with exponential backoff, and signs the request with an HMAC-SHA256 signature using the org's `apiKey` so they can verify authenticity.

---

### 6. Next.js UI Components

#### [MODIFY] Event detail page — `app/(protected)/events/[id]/page.tsx`
- FREE: Show existing "Register" button
- PLATFORM: Show "Register & Pay" button → opens provider picker modal → redirect to checkout
- EXTERNAL: Show "Register" button → modal shows org's payment link + instructions → status = PENDING_PAYMENT
- PENDING_PAYMENT registrations show a banner: "Awaiting payment confirmation from the organizer"

#### [NEW] [components/billing/PricingPlans.tsx](file:///d:/evently/components/billing/PricingPlans.tsx)
Three-column pricing card component (FREE / PRO / ENTERPRISE) with feature lists, monthly/yearly toggle, and "Subscribe" CTA that calls `/api/billing/subscribe`.

#### [NEW] [components/billing/ProviderPicker.tsx](file:///d:/evently/components/billing/ProviderPicker.tsx)
Small modal shown before checkout: "Pay with Razorpay 🇮🇳" / "Pay with Stripe 🌍"

#### [NEW] [app/(protected)/billing/page.tsx](file:///d:/evently/app/(protected)/billing/page.tsx)
Billing management page accessible from org settings:
- Current plan badge + features
- Usage metrics
- Upgrade/downgrade CTA
- Payment history table
- "Manage billing" button (Stripe portal)

#### [MODIFY] Org dashboard — event revenue section
- Revenue table: per-event breakdown (registrations count, paid count, total collected)
- Status for EXTERNAL mode: pending confirmations list

---

### 7. Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...       # Stripe Price ID for PRO plan
STRIPE_ENTERPRISE_PRICE_ID=price_... # Stripe Price ID for ENTERPRISE plan

# Razorpay
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# App
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
```

---

## Verification Plan

### Automated (dev/test mode)
```bash
# Stripe CLI webhook forwarding
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Test subscription flow
POST /api/billing/subscribe { plan: "PRO", provider: "stripe" }
# → receives Stripe test checkout URL → complete with card 4242424242424242

# Test event payment
POST /api/events/{id}/checkout { provider: "stripe" }
# → redirect → pay → webhook confirms → EventParticipation.isPaid = true

# Test org webhook delivery
# Set paymentWebhookUrl on org → complete payment → verify POST received by org endpoint

npx tsc --noEmit   # zero new errors
```

### Manual
- Upgrade org to PRO → confirm AI features unlock
- Create paid event (PLATFORM mode) → register as another org → complete checkout → verify registration confirmed
- Create paid event (EXTERNAL mode) → register → verify status = PENDING_PAYMENT
- Cancel subscription → verify downgrade to FREE

> [!IMPORTANT]
> Use Stripe test mode (`sk_test_...`) and Razorpay test mode during development. Never commit live keys.
