/**
 * lib/jobs/org-webhook-delivery.ts
 *
 * Delivers payment event webhooks to org-configured endpoints.
 * Signed with HMAC-SHA256 using the org's apiKey.
 * Enqueued as ORG_WEBHOOK_DELIVERY job (max 3 retries, handled by job processor).
 */

import { createHmac } from "crypto";

const WEBHOOK_TIMEOUT_MS = 10_000;

export interface OrgWebhookPayload {
    eventId: string;
    participationId: string;
    amount: number;
    currency: string;
    payerUserId: string;
    payerOrgId: string | null;
    webhookUrl: string;
    orgApiKey: string | null;
}

function buildSignature(body: string, secret: string): string {
    return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

export async function processOrgWebhookDelivery(payload: OrgWebhookPayload): Promise<void> {
    const {
        eventId,
        participationId,
        amount,
        currency,
        payerUserId,
        payerOrgId,
        webhookUrl,
        orgApiKey,
    } = payload;

    const timestamp = Math.floor(Date.now() / 1000);
    const requestBody = JSON.stringify({
        event: "payment.received",
        eventId,
        participationId,
        amount,
        currency,
        payerUserId,
        payerOrgId,
        timestamp,
    });

    const secret = orgApiKey ?? process.env.N8N_SHARED_SECRET ?? "evently-fallback-secret";
    const signature = buildSignature(requestBody, secret);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    try {
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Evently-Signature": signature,
                "X-Evently-Timestamp": String(timestamp),
            },
            body: requestBody,
            signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
            throw new Error(`[org-webhook] HTTP ${res.status} from ${webhookUrl}`);
        }

        console.log(`[org-webhook] ✓ Delivered payment.received to ${webhookUrl}`);
    } catch (err: any) {
        clearTimeout(timer);
        const label = err?.name === "AbortError" ? "timeout" : "error";
        console.error(`[org-webhook] ✗ ${label} delivering to ${webhookUrl}:`, err.message);
        throw err; // Re-throw → job processor retries
    }
}
