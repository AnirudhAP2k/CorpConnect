/**
 * domain/notifications/adapters/google-chat.adapter.ts
 *
 * FUTURE CHANNEL — Google Chat via Space Webhooks.
 *
 * To activate:
 *   1. In Google Chat, open a Space → Manage Webhooks → create a webhook.
 *   2. Store the webhook URL per-organization.
 *   3. Populate `recipient.googleChatWebhookUrl` when building recipients.
 *   4. Register in registry.ts: add `new GoogleChatAdapter()` to CHANNEL_REGISTRY.
 */

import type { NotificationChannel, NotificationRecipient, NotificationPayload } from "../types";

export class GoogleChatAdapter implements NotificationChannel {
    readonly channelId = "google-chat";

    async send(recipient: NotificationRecipient, payload: NotificationPayload): Promise<void> {
        // Silently no-op until configured — prevents breaking the pipeline
        if (!recipient.googleChatWebhookUrl) return;

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
        const linkText = payload.link ? ` <${appUrl}${payload.link}|View →>` : "";

        await fetch(recipient.googleChatWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cards: [
                    {
                        header: { title: "CorpConnect", imageUrl: `${appUrl}/logo.png` },
                        sections: [
                            {
                                widgets: [
                                    {
                                        textParagraph: {
                                            text: `<b>${payload.title}</b>\n${payload.body}${linkText}`,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }),
        });
    }
}
