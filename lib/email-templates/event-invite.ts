import { emailFooter } from "@/constants";
import { sendMail } from "@/lib/mailer";

interface EventInviteEmailData {
    eventName: string;
    inviterName: string;
    inviteUrl: string;
    recipientEmail: string;
    eventDate?: string;
    eventLocation?: string;
}

export async function sendEventInviteEmail(data: EventInviteEmailData) {
    const { eventName, inviterName, inviteUrl, recipientEmail, eventDate, eventLocation } = data;

    const html = getEventInviteEmailTemplate({
        eventName,
        inviterName,
        inviteUrl,
        eventDate,
        eventLocation,
    });

    return await sendMail({
        email: process.env.SENDER_EMAIL || "noreply@corpconnect.com",
        sendTo: recipientEmail,
        subject: `You're invited to attend: ${eventName}`,
        html,
        templateType: "EVENT_INVITATION",
        payload: { eventName, inviterName, inviteUrl, recipientEmail },
    });
}

function getEventInviteEmailTemplate(data: {
    eventName: string;
    inviterName: string;
    inviteUrl: string;
    eventDate?: string;
    eventLocation?: string;
}): string {
    const { eventName, inviterName, inviteUrl, eventDate, eventLocation } = data;

    const detailsSection = (eventDate || eventLocation)
        ? `
        <div style="background-color:#f8f9fa;border-radius:6px;padding:16px;margin:20px 0;">
            ${eventDate ? `<p style="margin:4px 0;font-size:14px;"><strong>📅 Date:</strong> ${eventDate}</p>` : ""}
            ${eventLocation ? `<p style="margin:4px 0;font-size:14px;"><strong>📍 Location:</strong> ${eventLocation}</p>` : ""}
        </div>`
        : "";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Invitation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #624CF5;
      margin-bottom: 10px;
    }
    h1 {
      color: #1a1a1a;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .content {
      margin-bottom: 30px;
    }
    .event-name {
      color: #624CF5;
      font-weight: 600;
    }
    .cta-button {
      display: inline-block;
      background-color: #624CF5;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .cta-button:hover {
      background-color: #5240d9;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #666;
      text-align: center;
    }
    .link-text {
      color: #666;
      font-size: 12px;
      word-break: break-all;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">CorpConnect</div>
    </div>
    
    <h1>You're Invited to an Event!</h1>
    
    <div class="content">
      <p>Hi there,</p>
      
      <p>
        <strong>${inviterName}</strong> has invited you to attend
        <span class="event-name">${eventName}</span> on CorpConnect.
      </p>
      
      ${detailsSection}

      <p>
        Click the button below to accept your invitation. If you don't have a CorpConnect account yet,
        you'll be able to create one and will be automatically registered for this event.
      </p>
      
      <div style="text-align: center;">
        <a href="${inviteUrl}" class="cta-button">Accept Invitation</a>
      </div>
      
      <p class="link-text">
        Or copy and paste this link in your browser:<br>
        ${inviteUrl}
      </p>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        This invitation will expire in 7 days. If you don't want to attend this event,
        you can safely ignore this email.
      </p>
    </div>

    ${emailFooter}

  </div>
</body>
</html>
    `;
}

export { getEventInviteEmailTemplate };
