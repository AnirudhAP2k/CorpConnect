import { emailFooter } from "@/constants";
import { sendMail } from "@/lib/mailer";

export type ConnectionEmailEvent = "REQUESTED" | "ACCEPTED" | "DECLINED" | "WITHDRAWN";

interface ConnectionEmailData {
  event: ConnectionEmailEvent;
  recipientEmail: string;
  recipientName: string;
  /** Org that initiated the action */
  actorOrgName: string;
  /** Org that received the action */
  targetOrgName: string;
  /** Optional intro message (only for REQUESTED) */
  message?: string;
  /** Link to the recipient org's dashboard to take action */
  dashboardLink: string;
}

export async function sendConnectionNotificationEmail(data: ConnectionEmailData) {
  const subject = getSubject(data);
  const html = getConnectionEmailTemplate(data);

  return await sendMail({
    email: process.env.SENDER_EMAIL || "noreply@CorpConnect.com",
    sendTo: data.recipientEmail,
    subject,
    html,
    templateType: `CONNECTION_${data.event}`,
    payload: {
      event: data.event,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      actorOrgName: data.actorOrgName,
      targetOrgName: data.targetOrgName,
      message: data.message ?? null,
    },
  });
}

function getSubject({ event, actorOrgName }: ConnectionEmailData): string {
  switch (event) {
    case "REQUESTED": return `${actorOrgName} wants to connect with your organization on CorpConnect`;
    case "ACCEPTED": return `${actorOrgName} accepted your connection request on CorpConnect`;
    case "DECLINED": return `${actorOrgName} declined your connection request on CorpConnect`;
    case "WITHDRAWN": return `${actorOrgName} withdrew their connection request on CorpConnect`;
  }
}

export function getConnectionEmailTemplate(data: ConnectionEmailData): string {
  const { event, recipientName, actorOrgName, targetOrgName, message, dashboardLink } = data;

  const eventMeta: Record<ConnectionEmailEvent, { icon: string; headline: string; body: string; cta: string; accentColor: string }> = {
    REQUESTED: {
      icon: "🤝",
      headline: `${actorOrgName} wants to connect!`,
      body: `<strong>${actorOrgName}</strong> has sent a connection request to <strong>${targetOrgName}</strong> on CorpConnect. Review the request on your dashboard and accept or decline.`,
      cta: "View Connection Request",
      accentColor: "#624CF5",
    },
    ACCEPTED: {
      icon: "✅",
      headline: "Connection accepted!",
      body: `<strong>${actorOrgName}</strong> has accepted your connection request from <strong>${targetOrgName}</strong>. You are now connected and can explore partnership opportunities.`,
      cta: "View Connected Organizations",
      accentColor: "#16a34a",
    },
    DECLINED: {
      icon: "❌",
      headline: "Connection request declined",
      body: `<strong>${actorOrgName}</strong> has declined your connection request from <strong>${targetOrgName}</strong>. You can discover other organizations on CorpConnect.`,
      cta: "Discover Organizations",
      accentColor: "#dc2626",
    },
    WITHDRAWN: {
      icon: "↩️",
      headline: "Connection request withdrawn",
      body: `<strong>${actorOrgName}</strong> has withdrawn their pending connection request to <strong>${targetOrgName}</strong>.`,
      cta: "View Your Dashboard",
      accentColor: "#d97706",
    },
  };

  const meta = eventMeta[event];

  const messageBlock = message
    ? `<div style="background:#f8f7ff;border-left:3px solid #624CF5;padding:14px 18px;border-radius:4px;margin:20px 0;font-style:italic;color:#555;">
              "${message}"
           </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.headline}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height:1.6; color:#333; max-width:600px; margin:0 auto; padding:20px; background-color:#f5f5f5; }
    .container { background:#fff; border-radius:8px; padding:40px; box-shadow:0 2px 4px rgba(0,0,0,.1); }
    .header { text-align:center; margin-bottom:30px; }
    .logo { font-size:32px; font-weight:bold; color:#624CF5; margin-bottom:10px; }
    .icon { font-size:48px; margin:10px 0; }
    h1 { color:#1a1a1a; font-size:22px; margin-bottom:16px; }
    .content { margin-bottom:30px; }
    .cta-button { display:inline-block; background-color:${meta.accentColor}; color:#fff; text-decoration:none; padding:14px 32px; border-radius:6px; font-weight:600; margin:20px 0; text-align:center; }
    .footer { margin-top:40px; padding-top:20px; border-top:1px solid #e0e0e0; font-size:14px; color:#666; text-align:center; }
    .link-text { color:#666; font-size:12px; word-break:break-all; margin-top:15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">CorpConnect</div>
      <div class="icon">${meta.icon}</div>
    </div>

    <h1>${meta.headline}</h1>

    <div class="content">
      <p>Hi ${recipientName},</p>
      <p>${meta.body}</p>
      ${messageBlock}
      <p>Visit your dashboard to manage your organization connections.</p>

      <div style="text-align:center;">
        <a href="${dashboardLink}" class="cta-button">${meta.cta}</a>
      </div>

      <p class="link-text">Or copy and paste this link in your browser:<br>${dashboardLink}</p>
    </div>

    ${emailFooter}

  </div>
</body>
</html>`;
}
