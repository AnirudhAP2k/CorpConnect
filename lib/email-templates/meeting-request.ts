import { sendMail } from "@/lib/mailer";
import type { MeetingEmailEvent } from "@/lib/types";

interface MeetingEmailData {
    event: MeetingEmailEvent;
    recipientEmail: string;
    recipientName: string;
    /** Org that initiated the action */
    actorOrgName: string;
    /** Event name the meeting is for */
    eventTitle: string;
    /** Optional agenda from the request */
    agenda?: string;
    /** Optional proposed meeting time */
    proposedTime?: string;
    /** Link to the event page for the recipient */
    eventLink: string;
}

// ─── Send helper ─────────────────────────────────────────────────────────────

export async function sendMeetingRequestEmail(data: MeetingEmailData) {
    const subject = getSubject(data);
    const html = getMeetingEmailTemplate(data);

    return await sendMail({
        email: process.env.SENDER_EMAIL || "noreply@evently.com",
        sendTo: data.recipientEmail,
        subject,
        html,
        templateType: `MEETING_${data.event}`,
        payload: {
            event: data.event,
            recipientEmail: data.recipientEmail,
            recipientName: data.recipientName,
            actorOrgName: data.actorOrgName,
            eventTitle: data.eventTitle,
            agenda: data.agenda ?? null,
            proposedTime: data.proposedTime ?? null,
        },
    });
}

function getSubject({ event, actorOrgName, eventTitle }: MeetingEmailData): string {
    switch (event) {
        case "REQUESTED": return `${actorOrgName} wants to meet you at ${eventTitle}`;
        case "ACCEPTED": return `${actorOrgName} accepted your meeting request for ${eventTitle}`;
        case "DECLINED": return `${actorOrgName} declined your meeting request for ${eventTitle}`;
        case "CANCELLED": return `${actorOrgName} cancelled their meeting request for ${eventTitle}`;
    }
}

// ─── HTML Template ────────────────────────────────────────────────────────────

export function getMeetingEmailTemplate(data: MeetingEmailData): string {
    const { event, recipientName, actorOrgName, eventTitle, agenda, proposedTime, eventLink } = data;

    type EventMeta = { icon: string; headline: string; body: string; cta: string; accentColor: string };
    const eventMeta: Record<MeetingEmailEvent, EventMeta> = {
        REQUESTED: {
            icon: "🤝",
            headline: `Meeting request from ${actorOrgName}`,
            body: `<strong>${actorOrgName}</strong> would like to schedule a meeting with you at <strong>${eventTitle}</strong>. Visit the event page to accept or decline.`,
            cta: "View Meeting Request",
            accentColor: "#624CF5",
        },
        ACCEPTED: {
            icon: "✅",
            headline: "Meeting confirmed!",
            body: `<strong>${actorOrgName}</strong> has accepted your meeting request at <strong>${eventTitle}</strong>. You&apos;re all set to connect!`,
            cta: "View Event",
            accentColor: "#16a34a",
        },
        DECLINED: {
            icon: "❌",
            headline: "Meeting request declined",
            body: `<strong>${actorOrgName}</strong> has declined your meeting request at <strong>${eventTitle}</strong>. You can explore other attendees to connect with.`,
            cta: "View Event",
            accentColor: "#dc2626",
        },
        CANCELLED: {
            icon: "↩️",
            headline: "Meeting request cancelled",
            body: `<strong>${actorOrgName}</strong> has cancelled their pending meeting request at <strong>${eventTitle}</strong>.`,
            cta: "View Event",
            accentColor: "#d97706",
        },
    };

    const meta = eventMeta[event];

    const agendaBlock = agenda
        ? `<div style="background:#f8f7ff;border-left:3px solid #624CF5;padding:14px 18px;border-radius:4px;margin:16px 0;font-style:italic;color:#555;">
             <strong style="font-style:normal;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Agenda</strong><br/>
             "${agenda}"
           </div>`
        : "";

    const timeBlock = proposedTime
        ? `<div style="background:#f0fdf4;border-left:3px solid #16a34a;padding:12px 18px;border-radius:4px;margin:16px 0;">
             <strong style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Proposed Time</strong><br/>
             <span style="color:#15803d;font-weight:600;">${new Date(proposedTime).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</span>
           </div>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.headline}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height:1.6; color:#333; max-width:600px; margin:0 auto; padding:20px; background:#f5f5f5; }
    .container { background:#fff; border-radius:8px; padding:40px; box-shadow:0 2px 4px rgba(0,0,0,.1); }
    .header { text-align:center; margin-bottom:30px; }
    .logo { font-size:32px; font-weight:bold; color:#624CF5; margin-bottom:10px; }
    .icon { font-size:48px; margin:10px 0; }
    h1 { color:#1a1a1a; font-size:22px; margin-bottom:16px; }
    .event-badge { display:inline-block; background:#f0edff; color:#624CF5; padding:4px 12px; border-radius:12px; font-size:13px; font-weight:600; margin-bottom:16px; }
    .cta-button { display:inline-block; background:${meta.accentColor}; color:#fff; text-decoration:none; padding:14px 32px; border-radius:6px; font-weight:600; margin:20px 0; }
    .footer { margin-top:40px; padding-top:20px; border-top:1px solid #e0e0e0; font-size:14px; color:#666; text-align:center; }
    .link-text { color:#666; font-size:12px; word-break:break-all; margin-top:15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Evently</div>
      <div class="icon">${meta.icon}</div>
    </div>

    <div class="event-badge">📅 ${eventTitle}</div>
    <h1>${meta.headline}</h1>

    <div>
      <p>Hi ${recipientName},</p>
      <p>${meta.body}</p>
      ${agendaBlock}
      ${timeBlock}
      <div style="text-align:center;">
        <a href="${eventLink}" class="cta-button">${meta.cta}</a>
      </div>
      <p class="link-text">Or copy and paste this link:<br>${eventLink}</p>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} Evently. All rights reserved.</p>
      <p style="font-size:12px;color:#999;">This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`;
}
