/**
 * domain/billing/errors.ts
 *
 * Typed errors so the HTTP layer can map domain failures to status codes
 * without the routes needing to know provider or business internals.
 */

/** A business-rule failure that carries the HTTP status the route should return. */
export class BillingError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
        this.name = "BillingError";
    }
}

/** Raised when a provider webhook fails signature/secret verification. */
export class WebhookVerificationError extends Error {
    constructor(message = "Invalid webhook signature") {
        super(message);
        this.name = "WebhookVerificationError";
    }
}
