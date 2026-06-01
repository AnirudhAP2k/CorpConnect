"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { createNotification } from "@/domain/notifications";
import { sendMail } from "@/lib/mailer";
import { revalidatePath } from "next/cache";

/**
 * Checks if the currently logged-in user is an App Admin.
 * Throws an error if unauthorized.
 */
async function requireAdmin() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        throw new Error("Unauthorized. Please log in.");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAppAdmin: true },
    });

    if (!user?.isAppAdmin) {
        throw new Error("Forbidden. Admin access required.");
    }

    return session.user;
}

interface RequestKybDocsParams {
    orgId: string;
    sendEmail: boolean;
    sendNotification: boolean;
    customMessage?: string;
}

/**
 * Admin action to notify the owners/admins of an organization that documents
 * are required to complete verification.
 */
export async function requestKybDocumentsAction({
    orgId,
    sendEmail,
    sendNotification,
    customMessage,
}: RequestKybDocsParams) {
    try {
        const adminUser = await requireAdmin();

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: { name: true, createdBy: true },
        });

        if (!org) {
            return { success: false, error: "Organization not found" };
        }

        // Find OWNER and ADMIN members of this organization
        const members = await prisma.organizationMember.findMany({
            where: {
                organizationId: orgId,
                role: { in: ["OWNER", "ADMIN"] },
            },
            select: {
                userId: true,
                user: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
            },
        });

        // Collect recipient IDs and emails
        const recipients: { userId: string; email?: string | null; name?: string | null }[] = members.map(m => ({
            userId: m.userId,
            email: m.user.email,
            name: m.user.name,
        }));

        // If no owners/admins are registered, fallback to the creator of the organization
        if (recipients.length === 0 && org.createdBy) {
            const creator = await prisma.user.findUnique({
                where: { id: org.createdBy },
                select: { id: true, email: true, name: true },
            });
            if (creator) {
                recipients.push({
                    userId: creator.id,
                    email: creator.email,
                    name: creator.name,
                });
            }
        }

        if (recipients.length === 0) {
            return { success: false, error: "No organization owners or admins found to notify." };
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BASE_URL ?? "http://localhost:3000";
        const uploadLink = `${appUrl}/organizations/${orgId}/complete-verification`;
        const bodyText = customMessage || "Please upload official KYB documents (such as Certificate of Incorporation, Tax Registration, or Address Proof) so we can complete your organization's legitimacy verification.";

        // Send notifications and/or emails
        for (const recipient of recipients) {
            // 1. In-app Notification
            if (sendNotification) {
                await createNotification({
                    userId: recipient.userId,
                    type: "VERIFICATION",
                    title: "Documents Required for Verification",
                    description: `To verify "${org.name}", please upload the required official KYB documents.`,
                    link: uploadLink,
                });
            }

            // 2. Email
            if (sendEmail && recipient.email) {
                const html = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                        <h2 style="color: #4f46e5; margin-bottom: 16px;">🔍 Official KYB Documents Required</h2>
                        <p>Hello ${recipient.name || "there"},</p>
                        <p>We are reviewing the verification request for your organization <strong>${org.name}</strong> on CorpConnect.</p>
                        <p style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px; margin: 20px 0; color: #334155; line-height: 1.6; border-radius: 4px;">
                            ${bodyText.replace(/\n/g, "<br/>")}
                        </p>
                        <p>Please click the button below to upload your documents securely and speed up the approval process:</p>
                        <div style="margin: 28px 0; text-align: center;">
                            <a href="${uploadLink}"
                               style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
                                Upload KYB Documents
                            </a>
                        </div>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                        <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
                            This review is part of our commitment to platform safety and corporate legitimacy. If you have any questions, please contact our support team.
                        </p>
                    </div>
                `;

                await sendMail({
                    email: process.env.SENDER_EMAIL ?? "noreply@corpconnect.app",
                    sendTo: recipient.email,
                    subject: `[Action Required] Upload KYB documents for ${org.name}`,
                    html,
                    templateType: "ORG_VERIFICATION_DOCS_REQUEST",
                    payload: { orgId, orgName: org.name },
                });
            }
        }

        revalidatePath(`/admin/organizations/verify/${orgId}`);
        return { success: true };
    } catch (error: any) {
        console.error("[requestKybDocumentsAction] Error:", error);
        return { success: false, error: error?.message || "Something went wrong." };
    }
}

interface CustomNotificationParams {
    userId: string;
    title: string;
    type: "VERIFICATION" | "INVITE" | "SYSTEM" | "MEETING" | "PAYMENT";
    description: string;
    link?: string;
}

/**
 * Admin action to create a custom notification for any user in the application.
 */
export async function sendCustomNotificationAction({
    userId,
    title,
    type,
    description,
    link,
}: CustomNotificationParams) {
    try {
        await requireAdmin();

        const userExists = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!userExists) {
            return { success: false, error: "Target user not found" };
        }

        const notif = await createNotification({
            userId,
            type,
            title,
            description,
            link,
        });

        return { success: notif.success, error: notif.error };
    } catch (error: any) {
        console.error("[sendCustomNotificationAction] Error:", error);
        return { success: false, error: error?.message || "Something went wrong." };
    }
}
