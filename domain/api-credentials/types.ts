import type { ApiTier } from "@prisma/client";

// ─── Public types ─────────────────────────────────────────────────────────────

/** Safe, client-facing credential metadata (never includes the real key). */
export interface ApiCredentialInfo {
    tenantId: string;
    apiKeyPrefix: string;
    tier: ApiTier;
    usageCount: number;
    usageLimit: number;
    lastUsedAt: Date | null;
    createdAt: Date;
}

/** Returned exactly once after generating a new API key. */
export interface ApiCredentialWithRawKey extends ApiCredentialInfo {
    /** Full plaintext key — shown once, never persisted. */
    apiKey: string;
}

/** Input for syncing credential tier after a subscription plan change. */
export interface SyncCredentialTierInput {
    organizationId: string;
    tier: ApiTier;
    usageLimit: number;
}
