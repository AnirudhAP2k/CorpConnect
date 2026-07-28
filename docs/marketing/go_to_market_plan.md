# CorpConnect Go-To-Market Plan

> Reference copy of the working plan, kept in the repo for future reference.
>
> Design system work has been split out into [design_changes.md](design_changes.md).

**Overview:** Launch CorpConnect as a self-hosted SaaS on a sub-$20/month VPS, using the existing public pages as the marketing surface, and win the first 3-5 paying organizations through concierge outbound to a single narrow beachhead. White-label is deferred until reference customers exist.

## Task checklist

### Phase 0 - Safe and truthful to sell

- [ ] Fix the three P0 security issues: session-derived actor in `domain/pitches/actions.ts`, cross-tenant member check in the org members route, auth + validation on `actions/upload.actions.ts`
- [ ] Implement the 14-day `TRIALING` flow (or remove the claim from the pricing page), and fix the broken `/sign-up`, `/onboarding`, and Contact Sales CTAs
- [ ] Add a seed script for industries and event categories, document the `isAppAdmin` bootstrap, and add a KYB-pending notification email
- [ ] Add `/api/health`, remove `ignoreBuildErrors` and `ignoreDuringBuilds` from `next.config.ts`, and fix the errors that surface
- [ ] Fix the `EOVERRIDE` bug in `package.json`: pin `import-in-the-middle` to an exact `3.3.1` dependency spec so npm/npx work from the repo root, and either move the overrides block under `pnpm.overrides` or delete it as dead config since pnpm ignores it
- [ ] `entrypoint.sh` runs `prisma db push --accept-data-loss` in dev, which drops the pgvector embedding columns on every `compose` build. `scripts/enable-pgvector.ts` restores the columns but not the embedding data, so every rebuild silently wipes embeddings against a shared DB. Needs a safer dev path.

### Phase 0.5 - Design consistency

Tracked in detail in [design_changes.md](design_changes.md).

- [ ] Design credibility quick wins: hide the dark mode toggle until dark tokens land, add a favicon/app icon, remove emoji from UI chrome, fix the unloaded `font-poppins` reference, replace `alert()` in `DeleteConfirmation`, restore suppressed focus rings
- [ ] Pull `DESIGN.md` and screen references from the Stitch MCP, commit as the design spec, and add a lint rule banning raw gray/white/slate/hex colors
- [ ] Convert `nx-*` tokens from static hex to CSS custom properties with `:root` and `.dark` values, referenced as `rgb(var(--token) / <alpha-value>)` to preserve opacity modifiers
- [ ] Rebuild billing (delete `billing.css`), auth, and onboarding onto `nx-*` tokens and shadcn primitives
- [ ] Migrate the demo-path screens off hardcoded grays, unify type scale and radius, verify in both themes
- [ ] Add `loading.tsx`, `error.tsx`, and `not-found.tsx` route files plus skeletons
- [ ] Fix mobile: messaging conversation switching, dashboard header overflow, fixed-width auth card

### Phase 0.75 - Region-aware pricing

- [ ] Create one `PLAN_PRICING` source of truth keyed by plan/currency/interval with per-provider price IDs; reconcile the contradictory `$49` on `/pricing` vs `$35` in `PricingPlans`, and make the yearly toggle actually bill yearly
- [ ] Wire `Organization.preferredCurrency` (currently a dead column) defaulted from `OrganizationMeta.jurisdiction`, derive the gateway from currency, validate provider/currency server-side, gate INR eligibility on KYB jurisdiction to prevent arbitrage, and lock currency once a subscription is active
- [ ] Add a display-only manual currency switch to the public `/pricing` page defaulting to USD (no geo-detection)
- [ ] Create the eight recurring plan objects (Stripe USD and Razorpay INR, monthly and yearly, PRO and ENTERPRISE) in each dashboard, and thread currency + interval through `createBillingCheckout` and the `PaymentGateway` port
- [ ] Build an in-app subscription management view for Razorpay customers, since `createBillingPortal` is hardcoded to Stripe
- [ ] Add a shared `formatMoney(minorUnits, currency)` utility and replace the ad-hoc formatters; add a currency picker to the event creation form
- [ ] Settle the final numbers (single USD figure, PPP INR around ₹1,499-1,999, and a yearly convention), and confirm with Razorpay and Stripe what recurring INR (RBI e-mandate) and USD collection your accounts support

### Phase 1 - Deploy

- [ ] Harden `compose.yaml` for a public VPS: remove exposed db/redis/service ports, set the n8n password or drop n8n, add app healthchecks, confirm `migrate deploy` and nightly `pg_dump`
- [ ] Provision a Hetzner VPS with Caddy for TLS, deploy the compose stack, wire Cloudflare DNS, Resend, LiveKit Cloud, and Sentry

### Phase 2 - Marketing engine

- [ ] Open PUBLIC event and organization detail pages to anonymous visitors via `lib/routes.ts` and the in-page visibility checks
- [ ] Add `sitemap.ts`, `robots.ts`, per-page `generateMetadata`, an `opengraph-image`, and convert the pricing page to a server component
- [ ] Add `/privacy`, `/terms`, and `/contact` with Cal.com demo booking; replace the fabricated trust logos and remove the placeholder home search box
- [ ] Self-host Umami on the VPS and add the tracking snippet

### Phase 3 - First customers

- [ ] Pick one beachhead segment and start 20 targeted conversations per week; recruit 3-5 design partners on a free-for-3-months feedback deal
- [ ] Publish two engineering write-ups (DDD migration, pgvector matchmaking) and start an incident log once live

## Strategic decision

Pursue **your own hosted SaaS** (option A). It simultaneously delivers the portfolio outcome (option C), because a live product with real paying orgs and real production incidents is a far better resume artifact than a codebase. **Defer white-label** (option D) until you have 3-5 reference customers, since licensing prospects will ask "who else runs this?" and the branding-config work is wasted until someone asks for it.

Do not pursue script-marketplace sales. Your four-service architecture (pgvector, Redis, LiveKit, a Python service loading a 90MB model) is undeployable by that audience, and the support burden would exceed the revenue.

## Marketing surface decision

Extend the existing app rather than building a separate marketing site. One domain, one deploy, one codebase. The highest-leverage change is unlocking the public directory for search engines, not writing new pages.

---

## Phase 0 - Make it safe and truthful to sell (2-3 weeks)

Blockers that must clear before any outsider touches the product.

Security P0s from [docs/code-review/code_review_2026_07_22.md](../../docs/code-review/code_review_2026_07_22.md):
- Client-supplied user IDs trusted in [domain/pitches/actions.ts](../../domain/pitches/actions.ts) - derive the actor from the session instead.
- Cross-tenant member mutation in [app/api/organizations/[id]/members/[memberId]/route.ts](../../app/api/organizations/[id]/members/[memberId]/route.ts) - verify the member belongs to the org in the URL.
- Unauthenticated file upload in [actions/upload.actions.ts](../../actions/upload.actions.ts) - require a session, validate MIME type and size.

Truth-in-advertising and broken conversion paths:
- The 14-day trial claim in [app/(root)/pricing/page.tsx](../../app/(root)/pricing/page.tsx) line 153 - either implement `TRIALING` (set `subscriptionStatus: "TRIALING"` plus a `trialEndsAt` on org creation, with a scheduled downgrade job) or delete the sentence. Implementing it is preferred; your gates in [lib/enterprise.ts](../../lib/enterprise.ts) and [domain/ai/quota.ts](../../domain/ai/quota.ts) already accept `TRIALING`.
- `/sign-up` does not exist - fix links in [app/(root)/about/page.tsx](../../app/(root)/about/page.tsx) and the footer to point at `/register`.
- Home "Join the Network" CTA points at auth-walled `/onboarding`; login CTA points at `/api/auth/login`. Both should go to `/register` and `/login`.
- "Contact Sales" on the Enterprise tier links to `/register` - point it at a real contact route.

First-run correctness:
- Add a seed script for industries and event categories. `getAllIndustries()` in [domain/organizations/queries.ts](../../domain/organizations/queries.ts) reads the DB, so a fresh deploy shows an empty onboarding dropdown.
- Document/script the `isAppAdmin` bootstrap so you can approve KYB on day one.
- Decide the KYB policy. Manual verification currently gates event creation via [domain/events/actions.ts](../../domain/events/actions.ts), which means a customer can pay and still not be able to create an event. At your scale, keep it manual on purpose - it forces a conversation with every signup - but add an email notification so you never leave someone waiting.

Production hygiene:
- Add `/api/health` to the Next.js app (all three microservices already expose `/health`).
- Remove `ignoreBuildErrors` and `ignoreDuringBuilds` from [next.config.ts](../../next.config.ts) and fix what surfaces. You cannot debug production with type errors shipping.
- **Fix the `overrides` conflict in [package.json](../../package.json).** `import-in-the-middle` is a direct dependency at `^3.3.1` (line 41) and also has an `overrides` entry pinned to `3.3.1` (line 97). npm rejects an override for a direct dependency unless the specs match exactly, so any `npm` or `npx` command run from the repo root fails with `EOVERRIDE`. Minimal fix: drop the caret so the dependency reads `"3.3.1"`. This is what was preventing the Stitch MCP server from starting, since Cursor launches it via `npx` with the workspace as its working directory.
- **Decide whether that override is actually needed.** The project uses pnpm exclusively (`pnpm-lock.yaml`, and every CI job runs `pnpm install`), and pnpm reads `pnpm.overrides` rather than npm's top-level `overrides`. The lockfile records no overrides section, so the whole block is currently inert. If the pin was added to force Sentry's transitive copy of `import-in-the-middle` to a specific version, that is not happening today - move it under a `pnpm.overrides` key, or remove it as dead configuration.
- **Stop the compose stack from wiping pgvector embeddings.** [entrypoint.sh](../../entrypoint.sh) branches on `NODE_ENV`: production runs `prisma migrate deploy` (safe), but the non-production path runs `prisma db push --accept-data-loss` and then `npx tsx scripts/enable-pgvector.ts` to restore the vector columns. Prisma cannot model the `vector` type, so `db push` drops those columns every time, and `--accept-data-loss` means the **embedding data is destroyed, not just the schema** - the restore script recreates empty columns and indexes. Every `compose` rebuild therefore silently invalidates all embeddings, which breaks recommendations and semantic search until they are regenerated. Options: gate the destructive path behind an explicit opt-in flag, use `prisma migrate dev` with the vector columns managed by a hand-written migration, or add an embedding-regeneration job that runs after the restore. Also note the README references `scripts/enable-pgvector.ts` while the repo currently has an untracked `scripts/enable-pgvector.js` - confirm which one `tsx` actually resolves.

Scope note: leave event ticketing and platform commission alone for now. `paymentMode` is never set by the event form and Stripe Connect is a commented TODO, so ticket revenue is a bigger project. Sell **org subscriptions** first and market events as free-to-host.

## Phase 0.5 - Design consistency on the demo path (2-3 weeks)

**Moved to [design_changes.md](design_changes.md).**

Summary: this is a design *adoption* problem, not a design problem. The Stitch-derived "Nexus Corporate" token set is solid, but only 33 files use `nx-*` tokens while 82 still use hardcoded grays, leaving three visual identities inside one product. Scope is the demo path only (register through billing), not all 30 protected routes. Billing is the highest-priority rebuild. Dark mode will be implemented properly, which requires converting the tokens to CSS custom properties first. That document also records the working Google Stitch MCP configuration and the setup problems encountered.

## Phase 0.75 - Region-aware pricing (1 week)

Goal: extend the existing IN/US payment-gateway split to subscription pricing, so an Indian org sees INR via Razorpay and an international org sees USD via Stripe.

Already in place and reusable:
- `Organization.preferredCurrency` ([prisma/schema.prisma](../../prisma/schema.prisma) line 208, default `"INR"`) - the column exists with **zero reads or writes** in application code. This is the persistence hook, already migrated.
- Provider toggle and dual `price`/`rupee` objects in [components/billing/PricingPlans.tsx](../../components/billing/PricingPlans.tsx) lines 26-73 and 138-151.
- Gateway registry `getPaymentGateway(provider)` in [domain/billing/gateway/index.ts](../../domain/billing/gateway/index.ts) lines 14-25.
- `OrganizationMeta.jurisdiction` (a 2-letter country code already collected for KYB) - use it to pick the default currency instead of adding a new question to onboarding.

Fix these first - they are worse than the missing feature:
- **The two pricing pages disagree.** [app/(root)/pricing/page.tsx](../../app/(root)/pricing/page.tsx) hardcodes PRO at `$49` in JSX (line 73); `PricingPlans.tsx` says `$35` / `₹2,999` (lines 42-43). A prospect sees one price on marketing and another after signup.
- **The monthly/yearly toggle is cosmetic.** The `billing` state in `PricingPlans.tsx` is never sent to `/api/billing/subscribe`, and adapters always use one env price ID, so "yearly" can be selected but bills monthly.
- **No provider/currency validation.** Event checkout passes `event.currency` to whichever provider the user picked ([app/api/events/[id]/checkout/route.ts](../../app/api/events/[id]/checkout/route.ts) lines 96-163) with no compatibility check.

Build:
- **One source of truth for prices.** A `PLAN_PRICING` constant keyed by plan, currency, and interval, each entry holding the display string, minor-unit amount, and the corresponding `stripePriceId` / `razorpayPlanId`. Both `/pricing` and `/billing` read from it. This structurally prevents the two pages from drifting again.
- **Expand the price ID env vars.** `STRIPE_PRICE_IDS` and `RAZORPAY_PRICE_IDS` ([lib/payment/stripe.ts](../../lib/payment/stripe.ts) lines 21-25, [lib/payment/razorpay.ts](../../lib/payment/razorpay.ts) lines 22-26) are currently one ID per plan. You need eight: two plans x two intervals x two providers.
- **Thread `currency` and `interval` through the call chain.** `createBillingCheckout` and the `PaymentGateway.createSubscriptionCheckout` port signature ([domain/billing/gateway/types.ts](../../domain/billing/gateway/types.ts)) currently carry neither.
- **Derive provider from currency** rather than asking the user to choose twice: INR routes to Razorpay, USD to Stripe. Keep the toggle as an override, not the primary control. Add server-side validation in [app/api/billing/subscribe/route.ts](../../app/api/billing/subscribe/route.ts) rejecting incompatible combinations.
- **Wire `preferredCurrency`**: default it from `OrganizationMeta.jurisdiction` at org creation, allow the owner to change it in settings, and **lock it once a subscription is active** so users cannot arbitrage between regions. Changing it afterwards should require cancel-and-resubscribe.
- **Add a shared `formatMoney(minorUnits, currency)` utility.** Today there is a `formatPrice` in [lib/utils.ts](../../lib/utils.ts) lines 48-56 that hardcodes USD and is never imported, plus at least six ad-hoc formatters (hardcoded `₹`, `en-IN` locale, raw string concatenation) across the billing page, revenue widget, org dashboard, provider picker, and payment receipts.
- **Add a currency picker to event creation.** [components/shared/EventsForm.tsx](../../components/shared/EventsForm.tsx) shows a dollar icon but `currency` silently defaults to `"INR"` via [domain/events/validation.ts](../../domain/events/validation.ts) line 20.
- **No geo-detection.** Decided: the public `/pricing` page defaults to USD with a visible manual currency switch. This avoids VPN and travel edge cases entirely and keeps the page statically renderable, which also helps the SEO work in Phase 2.

### Pricing model: purchasing-power, not conversion

Decided: INR is priced for the Indian market rather than converted from USD. Today ₹2,999 is roughly $36 against a $35 USD price, which is conversion, not localization.

- Suggested Pro: keep USD at one number and set INR meaningfully lower, in the ₹1,499-1,999/month range. Enterprise stays "Contact sales" in both currencies.
- **Pick a single USD number first.** The public page says `$49` and the in-app component says `$35`. Prefer `$49` since it is the publicly advertised figure and it is far easier to discount than to raise a price later.
- Set the yearly price by an explicit convention (two months free, so 10x monthly) rather than ad-hoc numbers, and make sure the interval is actually passed through to checkout.

**Arbitrage is now a real concern.** Under straight conversion, currency choice was cosmetic. Under PPP pricing with a free public currency switch, a US customer has a direct incentive to select INR.

**Confirmed: no jurisdiction gate exists at payment time today.** [app/api/billing/subscribe/route.ts](../../app/api/billing/subscribe/route.ts) lines 28-33 validates only that `plan` and `provider` are members of the `subscriptionPlans` / `paymentProviders` string arrays. `resolveBillingOrg` in [domain/billing/service.ts](../../domain/billing/service.ts) lines 38-41 checks OWNER/ADMIN role, then selects only `{ id, name, stripeCustomerId, razorpayCustomerId }` - it never loads `preferredCurrency` or the `meta` relation. `createBillingCheckout` takes only `{ userId, plan, provider }`, with no currency or interval parameter. Across the whole repo, `jurisdiction` appears only in the schema, migration, `lib/validation.ts`, the KYB form, the meta route, and two admin/verification views - **zero references under `domain/billing/`, `app/api/billing/`, or `lib/payment/`**.

Implementing the gate:
- **Single choke point:** every subscription checkout passes through `createBillingCheckout` -> `resolveBillingOrg`. Widen that `select` to include `preferredCurrency` and `meta.jurisdiction`, and extend the input type with `currency` and `interval`. One place to enforce, rather than per-route checks.
- **Handle the nullable case.** `jurisdiction` is `String?` in Prisma and `.optional().or(z.literal(""))` in `OrgKybSchema` ([lib/validation.ts](../../lib/validation.ts) line 169), so many orgs will have it empty. Either require it before allowing an INR subscription, or fall back to USD when absent. Do not let a null read as eligible.
- The public currency switch stays display-only; the binding decision happens server-side against the org record at subscribe time.
- Because KYB verification is manual at your scale, you already have a human checkpoint that sees the claimed jurisdiction before approving.
- Razorpay partially self-enforces since it needs Indian payment methods, but do not rely on that alone.
- Lock `preferredCurrency` once a subscription is active, as above.

**Razorpay subscribers currently have no self-serve billing management**, and this now matters more because INR is your India tier and India is the likely first beachhead. `createBillingPortal` hardcodes `getPaymentGateway("stripe")` ([domain/billing/service.ts](../../domain/billing/service.ts) lines 61-63) and the Razorpay adapter throws on `createPortalSession`. Build an in-app subscription management view (view plan, change plan, cancel) for Razorpay customers, or accept handling those requests manually while customer count is small.

### Recurring billing: plan objects needed per currency and interval

Confirmed both currencies use the gateways' native subscription models (`razorpay.subscriptions.create` and Stripe subscription-mode Checkout). Both a Razorpay Plan and a Stripe Price are **fixed-currency, fixed-interval objects**, so you need a matrix rather than the current single ID per plan: Stripe USD monthly and yearly for PRO and ENTERPRISE, plus Razorpay INR monthly and yearly for PRO and ENTERPRISE - eight IDs total. Create them in each dashboard first, then key them from `PLAN_PRICING`.

### Gateway constraints to verify before advertising prices

Recurring INR collection in India is subject to RBI e-mandate rules (Razorpay Subscriptions exist largely to handle this via UPI Autopay and card e-mandates, including per-transaction limits and pre-debit notification requirements), and accepting USD from an Indian entity carries export-of-services compliance obligations. Confirm what each account actually supports with Razorpay and Stripe before publishing either price. This constrains the design more than the code does.

## Phase 1 - Deploy for about $15/month (1 week)

You already have a working [compose.yaml](../../compose.yaml), so a single VPS is far cheaper than per-service PaaS and avoids free-tier cold starts that would break your WebSocket and LiveKit connections.

- Hetzner CPX31 or CX32 (roughly 8GB RAM, about EUR 8/month) plus swap. 4GB is too tight once the AI service loads `all-MiniLM-L6-v2` alongside Postgres, Redis, and three Node services.
- Caddy or Nginx in front for automatic TLS and to route subdomains to `server`, `ws-service`, and `lv-service`.
- Cloudflare DNS (free), Resend free tier (3k emails/month), LiveKit Cloud free tier, Sentry free tier (already wired in [next.config.ts](../../next.config.ts)).
- Domain: budget for `.com` at about $12/year rather than the `.io` currently referenced in copy.

Harden [compose.yaml](../../compose.yaml) before it faces the internet:
- Drop the `ports:` mappings for `db` (5435), `redis` (6379), `ai-service` (8000), `ws-service` (4000), `lv-service` (5000). Only the reverse proxy should be exposed.
- n8n defaults to `N8N_BASIC_AUTH_PASSWORD=changeme` (line 158). Set a real password or omit n8n from the production stack entirely to save RAM.
- Add healthchecks for `server`, `ws-service`, `lv-service`, `ai-service`; currently only `db` and `redis` have them.
- Confirm `entrypoint.sh` runs `prisma migrate deploy` (not `db push`) in production, and set up a nightly `pg_dump` to object storage.

## Phase 2 - Turn the app into its own marketing engine (1-2 weeks)

- **Open PUBLIC detail pages to anonymous visitors.** Add `/events/` and `/organizations/` prefixes to `publicRoutePrefixes` in [lib/routes.ts](../../lib/routes.ts), and keep the in-page checks that redirect for `PRIVATE`/`INVITE_ONLY` events. Remove the `if (!userId) redirect("/login")` at line 63 of [app/(protected)/organizations/[id]/page.tsx](../../app/(protected)/organizations/[id]/page.tsx) in favor of showing a public subset. This is the single highest-ROI marketing change available: every org profile and public event becomes an indexable landing page.
- Add `app/sitemap.ts` (include public orgs and events) and `app/robots.ts`.
- Add `generateMetadata` to `/`, `/about`, `/pricing`, discover, and the public detail pages, plus an `opengraph-image`. Root layout currently supplies only `title: "CorpConnect"`.
- Convert [app/(root)/pricing/page.tsx](../../app/(root)/pricing/page.tsx) from a client component to a server component (it only uses `useSession` to swap a CTA target) so pricing is properly indexable.
- Add `/privacy`, `/terms`, and `/contact`. Footer currently links these to `#`, which reads as abandoned to any B2B buyer.
- Self-host Umami on the same VPS for analytics (free, no cookie banner needed).
- Replace the fabricated trust logos (VERTEX, MERIDIAN) with either real design-partner logos or an honest "Built for" statement. Fake logos are a credibility risk with exactly the buyers you want.
- Remove the placeholder home search box ("Search functionality active internally...") or wire it to the real search.

## Phase 3 - Get the first 5 customers (ongoing, ~10 hrs/week)

At a sub-$50 budget, paid ads are not viable. Direct outbound and community access are the only channels that work pre-traction in B2B.

**Pick one narrow beachhead.** Recommended: coworking spaces, startup incubators, and startup-ecosystem chapters (TiE, NASSCOM 10k, university incubation cells) in one city. They run frequent recurring events, already manage member directories badly in spreadsheets and WhatsApp, care specifically about member-to-member matchmaking (your actual differentiator over Luma and Eventbrite), and can be sold to by one person without enterprise procurement. Alternatives if that fails: industry associations and chambers of commerce, or B2B event agencies.

- Run a **design partner program**: 3-5 orgs get Pro free for 3 months in exchange for a weekly feedback call, a logo on your site, and a testimonial. This solves the fake-logo problem and gives you the product feedback you can't get alone.
- Target 20 targeted conversations per week. Lead with the matchmaking and org-graph angle, never "event platform" - your own [docs/b2b_platform_differentiation.md](../../docs/b2b_platform_differentiation.md) makes this argument, use it as your sales narrative.
- Onboard every org by hand. Manual KYB is an asset here: it's a scheduled conversation with each new customer.
- Add Cal.com (free) for demo booking on `/contact`.
- **Pricing** is handled by Phase 0.75 (region-aware INR/USD). Revisit the actual numbers once you have real conversations - your first ten prospects will tell you more about willingness to pay than any desk research.
- Hold off on Product Hunt and Show HN until the product survives contact with the design partners.

## Phase 4 - Only after 3+ paying customers

- Revisit **white-label**: extract branding into config (`APP_NAME`, logo URL, theme tokens - currently "CorpConnect" is hardcoded across pages and email templates, and the sender is `alerts@corpconnect.com` in [domain/auth/actions.ts](../../domain/auth/actions.ts)), add custom-domain routing, and script per-instance provisioning.
- Revisit **event ticketing revenue**: wire `paymentMode` into the event creation form ([components/.../EventsForm.tsx](../../components/shared/EventsForm.tsx) only collects `price`/`isFree`), implement Stripe Connect for the commented-out commission in [app/api/events/[id]/checkout/route.ts](../../app/api/events/[id]/checkout/route.ts), and finish the `PROCESS_REFUND` stub in [lib/jobs/job-processor.ts](../../lib/jobs/job-processor.ts).
- Fill in dunning: `markSubscriptionPastDue` in [domain/billing/webhooks.ts](../../domain/billing/webhooks.ts) currently only writes to the DB and logs a warning - add email notification and a grace period.

## Portfolio capture (do this alongside, it is nearly free)

- Put the live URL and a concrete metric ("N organizations onboarded, M events hosted") at the top of your resume.
- Write up two engineering decisions publicly: the DDD/vertical-slice migration in [docs/optimization/ddd_architecture_migration.md](../../docs/optimization/ddd_architecture_migration.md), and the pgvector matchmaking design. Interviewers dig into real tradeoffs far more than feature lists.
- Keep a running incident log once you're live. "Here's an outage I caused and how I found it" is the strongest signal you can offer a hiring manager.
