import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/webhooks/org-verification
 *
 * Receives the AI service's verification result for an organization.
 * This is the async callback path — used if the AI service is configured
 * to process in the background and POST results back rather than responding
 * synchronously to the job handler.
 *
 * Security: caller must supply X-Verification-Secret matching
 *           ORG_VERIFICATION_WEBHOOK_SECRET env var.
 *
 * Body:
 *   {
 *     orgId: string;
 *     score: number;       // 0-100
 *     summary: string;
 *     flags: string[];
 *   }
 */

const VERIFY_WEBHOOK_SECRET = process.env.ORG_VERIFICATION_WEBHOOK_SECRET ?? "";
const TRUST_SCORE_THRESHOLD = 85;

export const POST = async (req: NextRequest) => {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const secret = req.headers.get("x-verification-secret") ?? "";
    if (!VERIFY_WEBHOOK_SECRET || secret !== VERIFY_WEBHOOK_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: {
        orgId?: string;
        score?: number;
        summary?: string;
        flags?: string[];
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { orgId, score, summary } = body;

    if (!orgId || score === undefined || !summary) {
        return NextResponse.json(
            { error: "orgId, score, and summary are required" },
            { status: 400 }
        );
    }

    if (typeof score !== "number" || score < 0 || score > 100) {
        return NextResponse.json(
            { error: "score must be a number between 0 and 100" },
            { status: 400 }
        );
    }

    // ── Verify org exists ─────────────────────────────────────────────────────
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true },
    });

    if (!org) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // ── Apply decision ────────────────────────────────────────────────────────
    const passed = score >= TRUST_SCORE_THRESHOLD;

    await prisma.organizationMeta.update({
        where: { organizationId: orgId },
        data: {
            verificationStatus: passed ? "VERIFIED" : "IN_REVIEW",
            verificationScore: score,
            verificationSummary: summary,
            verifiedAt: passed ? new Date() : null,
        },
    });

    if (passed) {
        await prisma.organization.update({
            where: { id: orgId },
            data: { isVerified: true },
        });
    }

    console.log(
        `[org-verification webhook] "${org.name}" → score=${score} → ${passed ? "VERIFIED" : "IN_REVIEW"}`
    );

    return NextResponse.json({
        ok: true,
        orgId,
        decision: passed ? "VERIFIED" : "IN_REVIEW",
    });
};
