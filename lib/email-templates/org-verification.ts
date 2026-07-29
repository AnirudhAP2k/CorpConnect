import { emailFooter } from "@/constants";
import { sendMail } from "@/lib/mailer";

export type OrgVerificationOutcome = "pending" | "approved" | "rejected";

interface OrgVerificationEmailData {
    recipientEmail: string;
    organizationName: string;
    organizationId: string;
    outcome: OrgVerificationOutcome;
    /** Reviewer note or auto-rejection reason, shown verbatim when present. */
    note?: string | null;
}

const COPY: Record<
    OrgVerificationOutcome,
    { subject: (org: string) => string; heading: string; accent: string; body: string; cta: string }
> = {
    pending: {
        subject: (org) => `We've received the verification details for ${org}`,
        heading: "Verification under review",
        accent: "#8a5100",
        body:
            "Thanks for submitting your business details. Our team reviews each organization manually " +
            "to keep the network trustworthy, which usually takes one to two business days. " +
            "You'll get an email as soon as a decision is made — no action is needed from you in the meantime.",
        cta: "View organization",
    },
    approved: {
        subject: (org) => `${org} is now verified on CorpConnect`,
        heading: "Verification approved",
        accent: "#0f6b34",
        body:
            "Your organization has been verified. The verified badge is now visible on your public profile, " +
            "and you have full access to networking, event hosting, and partner discovery.",
        cta: "Go to your organization",
    },
    rejected: {
        subject: (org) => `We couldn't verify ${org}`,
        heading: "Verification not approved",
        accent: "#b3261e",
        body:
            "We weren't able to verify your organization with the details provided. " +
            "This is usually resolved by re-submitting with a business email domain and current " +
            "registration documents. You can update your details and submit again.",
        cta: "Update verification details",
    },
};

export async function sendOrgVerificationEmail(data: OrgVerificationEmailData) {
    const { recipientEmail, organizationName, organizationId, outcome, note } = data;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BASE_URL ?? "";
    const link =
        outcome === "rejected"
            ? `${appUrl}/organizations/${organizationId}/complete-verification`
            : `${appUrl}/organizations/${organizationId}`;

    const copy = COPY[outcome];

    return await sendMail({
        email: process.env.SENDER_EMAIL || "noreply@corpconnect.com",
        sendTo: recipientEmail,
        subject: copy.subject(organizationName),
        html: getOrgVerificationTemplate({ organizationName, link, note, copy }),
        templateType: `ORG_VERIFICATION_${outcome.toUpperCase()}`,
        payload: { organizationName, organizationId, outcome, note: note ?? null },
    });
}

function getOrgVerificationTemplate({
    organizationName,
    link,
    note,
    copy,
}: {
    organizationName: string;
    link: string;
    note?: string | null;
    copy: (typeof COPY)[OrgVerificationOutcome];
}): string {
    const noteBlock = note
        ? `<blockquote style="margin:24px 0;padding:12px 16px;border-left:3px solid ${copy.accent};background-color:#fafafa;color:#475569;font-size:14px;">${escapeHtml(note)}</blockquote>`
        : "";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${copy.heading}</title>
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
    }
    .badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: ${copy.accent};
      margin-bottom: 8px;
    }
    h1 { font-size: 22px; margin: 0 0 16px; color: #041627; }
    .button {
      display: inline-block;
      background-color: #041627;
      color: #ffffff !important;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 28px 0 8px;
    }
    .footer { margin-top: 32px; text-align: center; color: #666; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">${copy.heading}</span>
    <h1>${escapeHtml(organizationName)}</h1>
    <p>${copy.body}</p>
    ${noteBlock}
    <a class="button" href="${link}">${copy.cta}</a>
    ${emailFooter}
  </div>
</body>
</html>
  `;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
