/**
 * domain/notifications/adapters/email.adapter.ts
 *
 * Sends notifications via email using the project's existing Resend integration.
 */

import { sendMail } from "@/lib/mailer";
import type { NotificationChannel, NotificationRecipient, NotificationPayload } from "../types";

export class EmailAdapter implements NotificationChannel {
    readonly channelId = "email";

    async send(recipient: NotificationRecipient, payload: NotificationPayload): Promise<void> {
        if (!recipient.email) return;

        const { subject, html } = buildEmailContent(recipient, payload);

        await sendMail({
            email: process.env.SENDER_EMAIL ?? "noreply@corpconnect.app",
            sendTo: recipient.email,
            subject,
            html,
            templateType: "NOTIFICATION",
            payload: { event: payload.event, title: payload.title },
        });
    }
}

// ─── Email Content Builder ────────────────────────────────────────────────────

function buildEmailContent(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
): { subject: string; html: string } {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://corpconnect.app";
    const ctaUrl = payload.link ? `${appUrl}${payload.link}` : appUrl;

    return {
        subject: payload.title,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${payload.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 1px 3px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;
                         letter-spacing:-0.3px;">CorpConnect</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">
                ${payload.title}
              </p>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                Hi ${recipient.name},
              </p>
              <p style="margin:0 0 32px;color:#374151;font-size:15px;line-height:1.6;">
                ${payload.body}
              </p>

              <!-- CTA -->
              <a href="${ctaUrl}"
                 style="display:inline-block;background:#1d4ed8;color:#ffffff;
                        text-decoration:none;padding:12px 24px;border-radius:8px;
                        font-size:14px;font-weight:600;">
                View Details →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f3f4f6;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                You are receiving this because you are registered with CorpConnect.
                <a href="${appUrl}/settings/notifications"
                   style="color:#6b7280;">Manage preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    };
}
