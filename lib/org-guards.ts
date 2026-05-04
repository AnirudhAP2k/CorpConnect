import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * Asserts that the given organization is fully verified (isVerified === true).
 * Returns a 403 NextResponse if it isn't, or `null` if the check passes.
 *
 * Usage in API routes:
 *   const guard = await requireVerifiedOrg(orgId);
 *   if (guard) return guard;
 */
export async function requireVerifiedOrg(orgId: string | null | undefined): Promise<NextResponse | null> {
    if (!orgId) {
        return NextResponse.json(
            { error: "An active verified organization is required for this action." },
            { status: 403 }
        );
    }

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { isVerified: true, name: true },
    });

    if (!org) {
        return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    if (!org.isVerified) {
        return NextResponse.json(
            {
                error: "Your organization must be verified before performing this action.",
                code: "ORG_NOT_VERIFIED",
                hint: "Complete your KYB documents at /organizations/{id}/complete-verification",
            },
            { status: 403 }
        );
    }

    return null; // ✓ passes
}

/**
 * Lightweight in-memory read — no DB hit.
 * Use when you already have the org's isVerified flag on the model.
 */
export function assertVerifiedOrgSync(isVerified: boolean, orgName?: string): NextResponse | null {
    if (!isVerified) {
        return NextResponse.json(
            {
                error: `"${orgName ?? "Your organization"}" is not yet verified. Complete KYB documents to unlock this action.`,
                code: "ORG_NOT_VERIFIED",
            },
            { status: 403 }
        );
    }
    return null;
}
