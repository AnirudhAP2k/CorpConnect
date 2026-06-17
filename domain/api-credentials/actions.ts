import { prisma } from "@/lib/db";
import { PLAN_API_LIMITS } from "@/constants";
import { hashToken } from "@/lib/hash";
import cryptoJs from "crypto-js";
import type { SubscriptionPlan, ApiTier, Prisma } from "@prisma/client";
import type { ApiCredentialWithRawKey, SyncCredentialTierInput } from "./types";

// ─── Key generation helpers ───────────────────────────────────────────────────

/**
 * Generates a cryptographically random API key with a recognizable prefix.
 * Format: `corpconnect_<env>_<64-hex-chars>`
 *
 * @returns `{ rawKey, prefix, hashed }` — the raw key is shown once,
 *          prefix is stored for display, and hashed is persisted for verification.
 */
function generateApiKey(): { rawKey: string; prefix: string; hashed: string } {
    const env = process.env.NODE_ENV === "production" ? "live" : "test";
    const rawKey = `corpconnect_${env}_${cryptoJs.lib.WordArray.random(64).toString(cryptoJs.enc.Hex)}`;
    const prefix = rawKey.slice(0, 25);
    const hashed = hashToken(rawKey);
    return { rawKey, prefix, hashed };
}

/**
 * Resolves the API usage limit for a subscription plan.
 * Falls back to FREE limits if the plan is unrecognized.
 */
function resolveUsageLimit(plan: SubscriptionPlan | ApiTier): number {
    return PLAN_API_LIMITS[plan] ?? PLAN_API_LIMITS.FREE;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Generates (or regenerates) an API key for the given organization.
 * The full plaintext key is returned **exactly once** — it is never
 * persisted in readable form.
 *
 * If a credential already exists it is overwritten (key rotation).
 * The tier and usage limit are derived from the org's current subscription plan.
 */
export async function generateCredential(
    organizationId: string
): Promise<ApiCredentialWithRawKey> {
    const { rawKey, prefix, hashed } = generateApiKey();

    const org = await prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { subscriptionPlan: true },
    });

    const tier = org.subscriptionPlan as ApiTier;
    const usageLimit = resolveUsageLimit(tier);

    // Run inside transaction: Revoke old, create new
    const credential = await prisma.$transaction(async (tx) => {
        // Soft delete existing active credentials
        await tx.apiCredential.updateMany({
            where: { organizationId, status: "ACTIVE" },
            data: { status: "REVOKED" },
        });

        // Create the new active credential
        return tx.apiCredential.create({
            data: {
                organizationId,
                apiKey: hashed,
                apiKeyPrefix: prefix,
                tier,
                usageLimit,
            },
        });
    });

    return {
        tenantId: credential.tenantId,
        apiKey: rawKey,
        apiKeyPrefix: prefix,
        tier: credential.tier,
        usageCount: credential.usageCount,
        usageLimit: credential.usageLimit,
        lastUsedAt: credential.lastUsedAt,
        createdAt: credential.createdAt,
    };
}

/**
 * Revokes the active API credentials for an organization.
 * Idempotent — no-ops if no active credential exists.
 */
export async function revokeCredential(organizationId: string): Promise<void> {
    await prisma.apiCredential.updateMany({
        where: { organizationId, status: "ACTIVE" },
        data: { status: "REVOKED" },
    });
}

/**
 * Syncs credential tier and usage limit after a subscription plan change.
 *
 * Used by payment webhook handlers (Stripe, Razorpay) when a subscription
 * is activated, renewed, or cancelled. Only updates active credentials.
 *
 * Safe to call within a Prisma interactive transaction — accepts an
 * optional `tx` client to participate in the caller's transaction boundary.
 */
export async function syncCredentialTier(
    input: SyncCredentialTierInput,
    tx?: Prisma.TransactionClient
): Promise<void> {
    const client = tx ?? prisma;

    await client.apiCredential.updateMany({
        where: { organizationId: input.organizationId, status: "ACTIVE" },
        data: {
            tier: input.tier,
            usageLimit: input.usageLimit,
        },
    });
}

/**
 * Ensures an active credential exists for an organization — creates one with a
 * generated key if absent, or upgrades the tier if already present.
 *
 * Used by subscription activation webhooks to guarantee a credential
 * is ready when a paid plan is activated for the first time.
 *
 * Safe to call within a Prisma interactive transaction — accepts an
 * optional `tx` client to participate in the caller's transaction boundary.
 */
export async function ensureCredential(
    organizationId: string,
    tier: ApiTier,
    usageLimit: number,
    tx?: Prisma.TransactionClient
): Promise<void> {
    const client = tx ?? prisma;

    const existing = await client.apiCredential.findFirst({
        where: { organizationId, status: "ACTIVE" },
    });

    if (existing) {
        await client.apiCredential.update({
            where: { id: existing.id },
            data: { tier, usageLimit },
        });
    } else {
        const { prefix, hashed } = generateApiKey();

        await client.apiCredential.create({
            data: {
                organizationId,
                apiKey: hashed,
                apiKeyPrefix: prefix,
                tier,
                usageLimit,
            },
        });
    }
}
