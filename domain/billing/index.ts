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

// Business services
export {
    createBillingCheckout,
    createBillingPortal,
    getBillingStatus,
} from "./service";
export type { BillingStatus } from "./service";

// Webhook processing
export { handleBillingEvent } from "./webhooks";
