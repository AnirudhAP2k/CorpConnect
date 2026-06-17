import { prisma } from "@/lib/db";
import type { ApiCredentialInfo } from "./types";

// ─── Read-only queries ────────────────────────────────────────────────────────

/**
 * Fetches safe, client-facing credential metadata for an organization.
 * Never returns the hashed API key.
 *
 * @returns Credential metadata, or `null` if no credential exists.
 */
export async function getCredentialByOrgId(
    organizationId: string
): Promise<ApiCredentialInfo | null> {
    return prisma.apiCredential.findFirst({
        where: { organizationId, status: "ACTIVE" },
        select: {
            tenantId: true,
            apiKeyPrefix: true,
            tier: true,
            usageCount: true,
            usageLimit: true,
            lastUsedAt: true,
            createdAt: true,
        },
    });
}

/**
 * Checks whether a credential record exists for the given organization.
 * Lightweight check used by webhook handlers before deciding to create vs update.
 */
export async function credentialExistsForOrg(
    organizationId: string
): Promise<boolean> {
    const count = await prisma.apiCredential.count({
        where: { organizationId, status: "ACTIVE" },
    });
    return count > 0;
}
