import { prisma } from "@/lib/db";
import { sendMemberInviteEmail } from "@/lib/email-templates/member-invite";
import { processConnectionNotification } from "@/lib/jobs/connection-notification";
import { processMeetingNotification } from "@/lib/jobs/meeting-notification";
import { cleanupOldJobs } from "@/lib/jobs/cleanup-old-jobs";
import {
	processEmbedEvent,
	processEmbedOrg,
} from "@/lib/jobs/embed-generation";
import { processSentimentAnalysis } from "@/lib/jobs/sentiment-analysis";
import { processN8nWorkflow } from "@/lib/jobs/n8n-trigger";
import type { N8nJobPayload } from "@/lib/jobs/automation";
import { processPaymentReceipt } from "@/lib/jobs/payment-receipt";
import { processOrgWebhookDelivery } from "@/lib/jobs/org-webhook-delivery";
import type { PaymentReceiptPayload } from "@/lib/jobs/payment-receipt";
import type { OrgWebhookPayload } from "@/lib/jobs/org-webhook-delivery";
import {
	processOrgLevel1,
	processOrgLevel2,
} from "@/lib/jobs/org-verification";
import type { OrgVerificationPayload } from "@/lib/jobs/org-verification";
import { processEventReminder } from "@/domain/notifications/handlers/event-reminder";
import { processVirtualRoomOpened } from "@/domain/notifications/handlers/virtual-room-opened";
import { processEventReport } from "@/lib/jobs/report-generator";
import { processGenerateTasklist } from "@/lib/jobs/tasklist-generator";
import type { EventReminderPayload } from "@/domain/notifications/types";
import type { VirtualRoomOpenedPayload } from "@/domain/notifications/types";
import type { GenerateReportPayload } from "@/lib/jobs/report-generator";
import type { GenerateTasklistPayload } from "@/lib/jobs/tasklist-generator";
import {
	expireStalePendingInvites,
	processInviteEmail,
} from "@/lib/jobs/pending-invites";
import { processEventInviteEmail } from "@/lib/jobs/event-invites";
import type { EventInviteEmailPayload } from "@/lib/jobs/event-invites";
import { processUploadScan } from "@/domain/file-uploads/scan";
import type { ScanUploadPayload } from "@/domain/file-uploads/types";
import {
	processAutoCreateVirtualRoom,
	type AutoCreateVirtualRoomPayload,
} from "@/lib/jobs/auto-create-virtual-room";
import { JobQueue } from "@prisma/client";
import {
	ConnectionNotificationPayload,
	MeetingNotificationPayload,
	EmbedEventPayload,
	EmbedOrgPayload,
} from "@/lib/types";

export async function processJobQueue() {
	console.log("[Job Processor] Processing job queue...");

	try {
		// Fetch pending jobs
		const pendingJobs = await prisma.jobQueue.findMany({
			where: {
				status: "PENDING",
				attempts: {
					lt: prisma.jobQueue.fields.maxAttempts,
				},
				scheduledAt: {
					lte: new Date(),
				},
			},
			take: 20, // Process 20 at a time
			orderBy: {
				scheduledAt: "asc",
			},
		});

		console.log(`[Job Processor] Found ${pendingJobs.length} pending jobs`);

		for (const job of pendingJobs) {
			try {
				// Mark as processing
				await prisma.jobQueue.update({
					where: { id: job.id },
					data: {
						status: "PROCESSING",
						attempts: job.attempts + 1,
					},
				});

				// Process based on job type
				await processJob(job);

				// Mark as completed
				await prisma.jobQueue.update({
					where: { id: job.id },
					data: {
						status: "COMPLETED",
						processedAt: new Date(),
						error: null,
					},
				});

				console.log(`[Job Processor] ✓ Completed job ${job.id} (${job.type})`);
			} catch (error: any) {
				console.error(`[Job Processor] ✗ Failed job ${job.id}:`, error.message);

				// Update with error
				await prisma.jobQueue.update({
					where: { id: job.id },
					data: {
						status: job.attempts + 1 >= job.maxAttempts ? "FAILED" : "PENDING",
						error: error.message,
					},
				});
			}
		}

		console.log("[Job Processor] ✓ Finished processing job queue");
	} catch (error) {
		console.error("[Job Processor] Error processing job queue:", error);
	}
}

async function processJob(job: JobQueue) {
	const payload = job.payload as JobQueue["payload"] | null;

	switch (job.type) {
		case "SEND_INVITE_EMAIL":
			await processInviteEmail(payload as { inviteId: string });
			break;

		case "SEND_NOTIFICATION": {
			const notifPayload = payload as { type: string };
			if (notifPayload.type?.startsWith("MEETING_")) {
				await processMeetingNotification(
					payload as unknown as MeetingNotificationPayload,
				);
			} else {
				await processConnectionNotification(
					payload as unknown as ConnectionNotificationPayload,
				);
			}
			break;
		}

		case "SEND_EVENT_REMINDER":
			await processEventReminder(payload as unknown as EventReminderPayload);
			break;

		case "VIRTUAL_ROOM_OPENED":
			await processVirtualRoomOpened(
				payload as unknown as VirtualRoomOpenedPayload,
			);
			break;

		case "AUTO_CREATE_VIRTUAL_ROOM":
			await processAutoCreateVirtualRoom(
				payload as unknown as AutoCreateVirtualRoomPayload,
			);
			break;

		case "GENERATE_REPORT":
			await processEventReport(payload as unknown as GenerateReportPayload);
			break;

		case "GENERATE_TASKLIST":
			await processGenerateTasklist(
				payload as unknown as GenerateTasklistPayload,
			);
			break;

		case "CLEANUP_DATA":
			await cleanupOldJobs();
			await expireStalePendingInvites();
			break;

		case "EMBED_EVENT":
			await processEmbedEvent(payload as unknown as EmbedEventPayload);
			break;

		case "EMBED_ORG":
			await processEmbedOrg(payload as unknown as EmbedOrgPayload);
			break;

		case "ANALYSE_FEEDBACK_SENTIMENT":
			await processSentimentAnalysis(
				payload as unknown as { feedbackId: string },
			);
			break;

		case "TRIGGER_N8N_WORKFLOW":
			await processN8nWorkflow(payload as unknown as N8nJobPayload);
			break;

		case "SEND_PAYMENT_RECEIPT":
			await processPaymentReceipt(payload as unknown as PaymentReceiptPayload);
			break;

		case "ORG_WEBHOOK_DELIVERY":
			await processOrgWebhookDelivery(payload as unknown as OrgWebhookPayload);
			break;

		case "VERIFY_ORG_LEVEL_1":
			await processOrgLevel1(payload as unknown as OrgVerificationPayload);
			break;

		case "VERIFY_ORG_LEVEL_2":
			await processOrgLevel2(payload as unknown as OrgVerificationPayload);
			break;

		case "PROCESS_REFUND":
			// TODO: Implement refund processing via Stripe/Razorpay APIs
			console.log("[Job] Processing refund:", payload);
			break;

		case "SEND_EVENT_INVITE_EMAIL":
			await processEventInviteEmail(
				payload as unknown as EventInviteEmailPayload,
			);
			break;

		case "SCAN_UPLOAD":
			await processUploadScan(payload as unknown as ScanUploadPayload);
			break;

		default:
			throw new Error(`Unknown job type: ${job.type}`);
	}
}
