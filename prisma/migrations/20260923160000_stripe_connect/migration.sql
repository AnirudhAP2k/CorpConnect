-- Stripe Connect Express payouts for USD PLATFORM event tickets.
-- stripeCustomerId remains the org-as-subscriber; this is the seller account.

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "stripeConnectedAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_stripeConnectedAccountId_key"
  ON "Organization"("stripeConnectedAccountId");

ALTER TABLE "EventPayment"
  ADD COLUMN IF NOT EXISTS "applicationFeeAmount" INTEGER,
  ADD COLUMN IF NOT EXISTS "destinationAccountId" TEXT;
