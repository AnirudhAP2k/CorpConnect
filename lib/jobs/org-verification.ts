/**
 * lib/jobs/org-verification.ts
 *
 * Checks organization legitimacy without LLM.
 *
 * Flow:
 * Level 1 (Org Creation): Checks email domain. If OK -> AWAITING_DOCS. Else -> REJECTED.
 * Level 2 (KYB Submission): Marks IN_REVIEW and notifies Admins to manual verify.
 */

import { createNotification } from "@/domain/notifications";
import { GENERIC_EMAIL_PROVIDERS } from "@/constants";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import {
    sendOrgVerificationEmail,
    type OrgVerificationOutcome,
} from "@/lib/email-templates/org-verification";

export interface OrgVerificationPayload {
    orgId: string;
    creatorEmail: string;
}

export async function processOrgLevel1(payload: OrgVerificationPayload): Promise<void> {
    const { orgId, creatorEmail } = payload;

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
    });

    if (!org) return;

    console.log(`[OrgVerification] Starting Level-1 check for "${org.name}" (${orgId})`);

    const domain = creatorEmail.split("@").pop()?.toLowerCase() || "";
    const isSuspicious = GENERIC_EMAIL_PROVIDERS.includes(domain);

    if (isSuspicious) {
        await prisma.organizationMeta.update({
            where: { organizationId: orgId },
            data: {
                verificationStatus: "REJECTED",
                verificationScore: 0,
                verificationReviewNote: "Auto-rejected L1: Generic email domain used.",
            },
        });
        console.log(`[OrgVerification] ✗ Auto-rejected "${org.name}" (Failed L1)`);
        await notifyOrgOwner(creatorEmail, org.name, orgId, "rejected",
            "The email domain used to create this organization belongs to a generic email provider. " +
            "Please re-submit using your company's own email domain.",
        );
    } else {
        await prisma.organizationMeta.update({
            where: { organizationId: orgId },
            data: { verificationStatus: "AWAITING_DOCS" },
        });
        console.log(`[OrgVerification] ⏳ "${org.name}" passed L1, awaiting docs.`);
    }
}

export async function processOrgLevel2(payload: OrgVerificationPayload): Promise<void> {
    const { orgId, creatorEmail } = payload;

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
    });

    if (!org) return;

    console.log(`[OrgVerification] Triggered Level-2 notification for "${org.name}" (${orgId})`);

    await notifyAdmins(org.name, orgId, "Organization submitted KYB documents for Level-2 manual review.");

    // Confirm receipt to the submitter. Without this the submitter sees the form
    // succeed and then hears nothing until an admin happens to review it.
    await notifyOrgOwner(creatorEmail, org.name, orgId, "pending");
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

async function notifyAdmins(orgName: string, orgId: string, reason: string | null) {
    try {
        const admins = await prisma.user.findMany({
            where: { isAppAdmin: true },
            select: { id: true, email: true, name: true },
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BASE_URL ?? "";
        const reviewLink = `${appUrl}/admin/organizations/${orgId}`;
        const summaryHtml = reason
            ? `<blockquote style="border-left:3px solid #6366f1;padding-left:12px;color:#475569">${reason}</blockquote>`
            : "";

        const html = `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#6366f1">🔍 Organization Pending Verification Review</h2>
              <p>The organization <strong>${orgName}</strong> requires manual review before being verified on the platform.</p>
              ${summaryHtml}
              <div style="margin:30px 0;">
                <a href="${reviewLink}"
                   style="display:inline-block;background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">
                  Review Organization
                </a>
              </div>
              <hr style="border-color:#e2e8f0"/>
              <p style="font-size:12px;color:#94a3b8">This is an automated alert from CorpConnect. Do not reply.</p>
            </div>
        `;

        for (const admin of admins) {
            if (!admin.email) continue;
            await sendMail({
                email: process.env.SENDER_EMAIL ?? "noreply@corpconnect.app",
                sendTo: admin.email,
                subject: `[Action Required] Verify organization: ${orgName}`,
                html,
                templateType: "ORG_VERIFICATION_REVIEW",
                payload: { orgId, orgName },
            });

            await createNotification({
                type: "VERIFICATION",
                userId: admin.id,
                title: "Organization Pending Verification Review",
                description: `The organization ${orgName} requires manual review before being verified on the platform.`,
                link: reviewLink,
            })
        }
    } catch (err) {
        console.error("[OrgVerification] Failed to notify admins:", err);
    }
}

export async function notifyOrgOwner(
    email: string,
    orgName: string,
    orgId: string,
    outcome: OrgVerificationOutcome,
    note?: string | null,
) {
    if (!email || email === "unknown") {
        console.warn(`[OrgVerification] No recipient email for "${orgName}" (${outcome}); skipping email.`);
        return;
    }

    try {
        await sendOrgVerificationEmail({
            recipientEmail: email,
            organizationName: orgName,
            organizationId: orgId,
            outcome,
            note,
        });
        console.log(`[OrgVerification] Sent "${outcome}" email for "${orgName}" to ${email}`);
    } catch (err) {
        // Never let a mail failure fail the surrounding job or request.
        console.error(`[OrgVerification] Failed to email org owner (${outcome}):`, err);
    }
}
