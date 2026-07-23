/**
 * domain/billing/gateway/types.ts
 *
 * The payment-gateway *port*: one provider-agnostic contract the app depends on.
 * Each provider (Stripe, Razorpay) ships an adapter implementing this interface,
 * so adding/removing a provider never touches route or domain-service code.
 *
 * All types are expressed in our own domain language — no Stripe/Razorpay SDK
 * types leak across this boundary.
 */

export type PaymentProvider = "stripe" | "razorpay";

export type BillingPlan = "PRO" | "ENTERPRISE";

/** Minimal org shape the gateway needs to create customers / checkouts. */
export interface BillingOrg {
    id: string;
    name: string;
    stripeCustomerId: string | null;
    razorpayCustomerId: string | null;
}

export interface SubscriptionCheckout {
    /** URL the client should be redirected to in order to pay. */
    url: string;
    /** Provider subscription id, when the provider creates one up front (Razorpay). */
    subscriptionId?: string;
}

export interface PortalSession {
    url: string;
}

/**
 * Provider-agnostic billing events, produced by an adapter's `verifyWebhook`
 * and consumed by the shared `handleBillingEvent` domain service. This is where
 * the normalization pays off: business logic is written once, not per provider.
 */
export type NormalizedBillingEvent =
    | {
          kind: "subscription.activated";
          provider: PaymentProvider;
          orgId: string;
          plan: BillingPlan;
          providerSubscriptionId: string;
          currentPeriodStart: Date;
          currentPeriodEnd: Date;
      }
    | {
          kind: "subscription.renewed";
          providerSubscriptionId: string;
          currentPeriodStart: Date;
          currentPeriodEnd: Date;
      }
    | {
          kind: "subscription.payment_failed";
          providerSubscriptionId: string;
      }
    | {
          kind: "subscription.cancelled";
          providerSubscriptionId: string;
      }
    | {
          kind: "event_payment.succeeded";
          participationId: string;
          /** How the adapter located (or expects to locate) the EventPayment row. */
          findBy: { participationId: string } | { providerPaymentId: string };
          /** Provider payment id to persist (Razorpay swaps the stored order id). */
          updateProviderPaymentId?: string;
          /** Hosted receipt URL, when the provider supplies one (Stripe). */
          receiptUrl?: string | null;
          /** Attach the org's active API key to the outbound webhook job (Stripe). */
          attachOrgApiKey: boolean;
          /** Mark the payment succeeded even if no EventPayment row is found (Stripe). */
          markSucceededIfMissing: boolean;
      }
    /** Recognized-but-unhandled or irrelevant provider event — safely ignored. */
    | { kind: "ignored" };

/**
 * The payment-gateway port. Implemented once per provider.
 */
export interface PaymentGateway {
    readonly provider: PaymentProvider;

    /** Returns the provider customer id for the org, creating+persisting it if absent. */
    ensureCustomer(org: BillingOrg): Promise<string>;

    /** Creates a subscription checkout and returns the URL to redirect the payer to. */
    createSubscriptionCheckout(input: {
        org: BillingOrg;
        plan: BillingPlan;
        appUrl: string;
    }): Promise<SubscriptionCheckout>;

    /** Creates a self-serve customer portal session. Not all providers support this. */
    createPortalSession(org: BillingOrg, appUrl: string): Promise<PortalSession>;

    /**
     * Verifies the raw webhook payload+signature and translates it into zero or
     * more provider-agnostic events. Throws {@link WebhookVerificationError} when
     * the signature/secret is invalid.
     */
    verifyWebhook(rawBody: string, signature: string): Promise<NormalizedBillingEvent[]>;
}
