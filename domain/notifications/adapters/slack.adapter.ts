/**
 * domain/notifications/adapters/slack.adapter.ts
 *
 * FUTURE CHANNEL — Slack via Incoming Webhooks.
 *
 * To activate:
 *   1. Create a Slack App at api.slack.com and enable Incoming Webhooks.
 *   2. Store the webhook URL per-organization in a new `slackWebhookUrl` field
 *      on the Organization model (or in an OrganizationSettings table).
 *   3. Populate `recipient.slackWebhookUrl` when building recipients in handlers.
 *   4. Register in registry.ts: add `new SlackAdapter()` to CHANNEL_REGISTRY.
 */

import type { NotificationChannel, NotificationRecipient, NotificationPayload } from "../types";

export class SlackAdapter implements NotificationChannel {
    readonly channelId = "slack";

    async send(recipient: NotificationRecipient, payload: NotificationPayload): Promise<void> {
        // Silently no-op until configured — prevents breaking the pipeline
        if (!recipient.slackWebhookUrl) return;

        await fetch(recipient.slackWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                blocks: [
                    {
                        type: "header",
                        text: { type: "plain_text", text: payload.title, emoji: true },
                    },
                    {
                        type: "section",
                        text: { type: "mrkdwn", text: payload.body },
                        ...(payload.link
                            ? {
                                  accessory: {
                                      type: "button",
                                      text: { type: "plain_text", text: "View →" },
                                      url: `${process.env.NEXT_PUBLIC_APP_URL}${payload.link}`,
                                  },
                              }
                            : {}),
                    },
                ],
            }),
        });
    }
}
