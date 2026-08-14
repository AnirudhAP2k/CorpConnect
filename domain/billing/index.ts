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
    BillingOrg,
    NormalizedBillingEvent,
    SubscriptionCheckout,
    PortalSession,
} from "./gateway/types";

// Queries (safe for Server Components)
export { getBillingAccess, getBillingOverview } from "./queries";
export type { BillingAccess } from "./queries";

// Business services
export {
    createBillingCheckout,
    createBillingPortal,
    getBillingStatus,
    confirmPaidParticipation,
} from "./service";
export type { BillingStatus } from "./service";

// Webhook processing
export { handleBillingEvent } from "./webhooks";
