"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { createNotification } from "@/domain/notifications";
import { sendMail } from "@/lib/mailer";
import { revalidatePath } from "next/cache";
import { isUUID } from "@/lib/utils";

export interface ListJobQueueAdminInput {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
}

/**
 * Checks if the currently logged-in user is an App Admin.
 * Throws an error if unauthorized.
 */
const requireAdmin = async () => {
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
        await requireAdmin();

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

// ─── Automation workflow templates (platform catalog) ─────────────────────────

export async function listAutomationWorkflowTemplatesAction() {
    try {
        await requireAdmin();
        const templates = await prisma.automationWorkflowTemplate.findMany({
            orderBy: [{ trigger: "asc" }, { name: "asc" }],
        });
        return {
            success: true as const,
            data: templates.map(t => ({
                ...t,
                createdAt: t.createdAt.toISOString(),
                updatedAt: t.updatedAt.toISOString(),
            })),
        };
    } catch (error: any) {
        return { success: false as const, error: error?.message || "Something went wrong." };
    }
}

export async function updateAutomationWorkflowTemplateAction(input: {
    id: string;
    webhookUrl?: string;
    name?: string;
    description?: string | null;
    defaultPromptTemplate?: string | null;
    isActive?: boolean;
}) {
    try {
        await requireAdmin();

        if (input.webhookUrl !== undefined) {
            if (!input.webhookUrl.startsWith("https://")) {
                return { success: false as const, error: "Webhook URL must start with https://" };
            }
        }

        const updated = await prisma.automationWorkflowTemplate.update({
            where: { id: input.id },
            data: {
                ...(input.webhookUrl !== undefined ? { webhookUrl: input.webhookUrl } : {}),
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.description !== undefined ? { description: input.description } : {}),
                ...(input.defaultPromptTemplate !== undefined
                    ? { defaultPromptTemplate: input.defaultPromptTemplate }
                    : {}),
                ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            },
        });

        revalidatePath("/admin/automations");
        return {
            success: true as const,
            data: {
                ...updated,
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
            },
        };
    } catch (error: any) {
        console.error("[updateAutomationWorkflowTemplateAction] Error:", error);
        return { success: false as const, error: error?.message || "Something went wrong." };
    }
}

// ─── Job Queue Admin Management Actions ─────────────────────────────────────

export async function listJobQueueAdminAction(input: ListJobQueueAdminInput = {}) {
    await requireAdmin();

    const page = Math.max(1, input.page || 1);
    const limit = Math.max(1, Math.min(50, input.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (input.status && input.status !== "ALL") {
        where.status = input.status;
    }

    if (input.type && input.type !== "ALL") {
        where.type = input.type;
    }

    if (input.search?.trim()) {
        const q = input.search.trim();
        const isUuid = isUUID(q);

        const orConditions: any[] = [
            { error: { contains: q, mode: "insensitive" } },
        ];

        if (isUuid) {
            orConditions.push({ id: q });
        }

        where.OR = orConditions;
    }

    try {
        const [jobs, totalCount, failedCount, pendingCount, processingCount, completedCount, cancelledCount] = await Promise.all([
            prisma.jobQueue.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: "desc" },
            }),
            prisma.jobQueue.count({ where }),
            prisma.jobQueue.count({ where: { status: "FAILED" } }),
            prisma.jobQueue.count({ where: { status: "PENDING" } }),
            prisma.jobQueue.count({ where: { status: "PROCESSING" } }),
            prisma.jobQueue.count({ where: { status: "COMPLETED" } }),
            prisma.jobQueue.count({ where: { status: "CANCELLED" } }),
        ]);

        const totalPages = Math.ceil(totalCount / limit) || 1;

        return {
            success: true as const,
            data: {
                jobs: jobs.map((j: any) => ({
                    ...j,
                    scheduledAt: j.scheduledAt.toISOString(),
                    processedAt: j.processedAt?.toISOString() || null,
                    createdAt: j.createdAt.toISOString(),
                    updatedAt: j.updatedAt.toISOString(),
                })),
                totalCount,
                totalPages,
                currentPage: page,
                stats: {
                    failed: failedCount,
                    pending: pendingCount,
                    processing: processingCount,
                    completed: completedCount,
                    cancelled: cancelledCount,
                },
            },
        };
    } catch (error: any) {
        console.error("[listJobQueueAdminAction] Error:", error);
        return { success: false as const, error: error?.message || "Failed to fetch job queue entries." };
    }
}

export async function requeueJobAdminAction(jobId: string) {
    await requireAdmin();

    try {
        const job = await prisma.jobQueue.findUnique({
            where: { id: jobId },
        });

        if (!job) {
            return { success: false as const, error: "Job not found." };
        }

        await prisma.jobQueue.update({
            where: { id: jobId },
            data: {
                status: "PENDING",
                attempts: 0,
                scheduledAt: new Date(),
                processedAt: null,
                error: null,
            },
        });

        revalidatePath("/admin/jobs");
        return { success: true as const, message: `Re-queued job ${jobId} (${job.type})` };
    } catch (error: any) {
        console.error("[requeueJobAdminAction] Error:", error);
        return { success: false as const, error: error?.message || "Failed to re-queue job." };
    }
}

export async function requeueAllFailedJobsAdminAction(jobType?: string) {
    await requireAdmin();

    try {
        const where: any = { status: "FAILED" };
        if (jobType && jobType !== "ALL") {
            where.type = jobType;
        }

        const result = await prisma.jobQueue.updateMany({
            where,
            data: {
                status: "PENDING",
                attempts: 0,
                scheduledAt: new Date(),
                processedAt: null,
                error: null,
            },
        });

        revalidatePath("/admin/jobs");
        return { success: true as const, count: result.count, message: `Re-queued ${result.count} failed job(s)` };
    } catch (error: any) {
        console.error("[requeueAllFailedJobsAdminAction] Error:", error);
        return { success: false as const, error: error?.message || "Failed to re-queue jobs." };
    }
}

export async function cancelJobAdminAction(jobId: string) {
    await requireAdmin();

    try {
        await prisma.jobQueue.update({
            where: { id: jobId },
            data: {
                status: "CANCELLED",
            },
        });

        revalidatePath("/admin/jobs");
        return { success: true as const, message: `Cancelled job ${jobId}` };
    } catch (error: any) {
        console.error("[cancelJobAdminAction] Error:", error);
        return { success: false as const, error: error?.message || "Failed to cancel job." };
    }
}

export async function deleteJobAdminAction(jobId: string) {
    await requireAdmin();

    try {
        await prisma.jobQueue.delete({
            where: { id: jobId },
        });

        revalidatePath("/admin/jobs");
        return { success: true as const, message: `Deleted job ${jobId}` };
    } catch (error: any) {
        console.error("[deleteJobAdminAction] Error:", error);
        return { success: false as const, error: error?.message || "Failed to delete job." };
    }
}


