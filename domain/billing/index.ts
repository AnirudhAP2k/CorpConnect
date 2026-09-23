/**
 * Public API for the Billing domain.
 *
 * Import from "@/domain/billing" for all consumer code (API routes, webhooks).
 */

// Errors
export { BillingError, WebhookVerificationError } from "./errors";

// Gateway port + registry
export { getPaymentGateway } from "./gateway";
export type {
	PaymentGateway,
	PaymentProvider,
	BillingPlan,
	BillingCurrency,
	BillingInterval,
	BillingOrg,
	NormalizedBillingEvent,
	SubscriptionCheckout,
	PortalSession,
} from "./gateway/types";

// Queries (safe for Server Components)
export { getBillingAccess, getBillingOverview } from "./queries";
export type { BillingAccess } from "./queries";

export {
	createStripeConnectOnboardingLink,
	createStripeConnectDashboardLink,
	getStripeConnectStatus,
	isStripeConnectReady,
	syncStripeConnectAccount,
	usdPlatformConnectError,
} from "./connect";
export type { StripeConnectStatus } from "./connect";

// Business services
export {
	createBillingCheckout,
	createBillingPortal,
	cancelOrgSubscription,
	updatePreferredCurrency,
	syncPreferredCurrencyFromJurisdiction,
	getBillingStatus,
	confirmPaidParticipation,
} from "./service";
export type { BillingStatus } from "./types";

export {
	PLAN_PRICING,
	isCurrencyLocked,
	currencyFromJurisdiction,
	isInrEligible,
	providerForCurrency,
} from "./pricing";

// Webhook processing
export { handleBillingEvent } from "./webhooks";
