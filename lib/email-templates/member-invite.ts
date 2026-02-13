import { sendMail } from "@/lib/mailer";

interface MemberInviteEmailData {
    organizationName: string;
    inviterName: string;
    role: string;
    inviteLink: string;
    recipientEmail: string;
}

export async function sendMemberInviteEmail(data: MemberInviteEmailData) {
    const { organizationName, inviterName, role, inviteLink, recipientEmail } = data;

    const html = getMemberInviteEmailTemplate({
        organizationName,
        inviterName,
        role,
        inviteLink,
    });

    return await sendMail({
        email: process.env.SENDER_EMAIL || "noreply@evently.com",
        sendTo: recipientEmail,
        subject: `You've been invited to join ${organizationName} on Evently`,
        html,
    });
}

function getMemberInviteEmailTemplate(data: {
    organizationName: string;
    inviterName: string;
    role: string;
    inviteLink: string;
}): string {
    const { organizationName, inviterName, role, inviteLink } = data;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Organization Invitation</title>
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
    .organization-name {
      color: #624CF5;
      font-weight: 600;
    }
    .role-badge {
      display: inline-block;
      background-color: #f0f0f0;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      color: #666;
      margin: 10px 0;
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
      <div class="logo">Evently</div>
    </div>
    
    <h1>You've been invited!</h1>
    
    <div class="content">
      <p>Hi there,</p>
      
      <p>
        <strong>${inviterName}</strong> has invited you to join 
        <span class="organization-name">${organizationName}</span> on Evently.
      </p>
      
      <p>
        You'll be joining as: <span class="role-badge">${role}</span>
      </p>
      
      <p>
        Click the button below to accept this invitation and join the organization:
      </p>
      
      <div style="text-align: center;">
        <a href="${inviteLink}" class="cta-button">Accept Invitation</a>
      </div>
      
      <p class="link-text">
        Or copy and paste this link in your browser:<br>
        ${inviteLink}
      </p>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        This invitation will expire in 7 days. If you don't want to join this organization, 
        you can safely ignore this email.
      </p>
    </div>
    
    <div class="footer">
      <p>
        © ${new Date().getFullYear()} Evently. All rights reserved.
      </p>
      <p style="font-size: 12px; color: #999;">
        This is an automated email. Please do not reply to this message.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export { getMemberInviteEmailTemplate };
