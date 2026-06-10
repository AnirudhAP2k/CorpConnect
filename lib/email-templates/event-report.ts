/**
 * lib/email-templates/event-report.ts
 *
 * HTML email template for the post-event analytics report.
 * Sent to all OWNER and ADMIN members of the hosting organization.
 *
 * Template sections:
 *   1. Metrics snapshot (registrations, attendance rate, avg rating, avg watch time)
 *   2. Sentiment score bar (visual representation)
 *   3. Top themes chips
 *   4. AI executive summary
 *   5. CTA → view full report in-app
 */

import { sendMail } from "@/lib/mailer";

// ─── Data shape ───────────────────────────────────────────────────────────────

export interface EventReportEmailData {
    recipientEmail:    string;
    recipientName:     string | null;
    eventId:           string;
    eventTitle:        string;
    eventDate:         string;        // e.g. "June 10, 2026"
    organizationName:  string;
    // Metrics
    totalRegistrations: number;
    totalAttendance:    number;
    attendanceRate:     number;       // 0–1 (e.g. 0.72 → 72%)
    avgRating:          number | null; // 1–5
    avgDurationMins:    number | null; // average watch time in minutes
    viewsCount:         number;
    // Sentiment
    sentimentScore:     number | null; // -1 to +1
    sentimentDistribution: {
        positive: number;             // 0–100 percent
        neutral:  number;
        negative: number;
    };
    topThemes:          string[];
    aiExecutiveSummary: string;
    // Link
    reportUrl:          string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sentimentLabel(score: number | null): string {
    if (score === null) return "N/A";
    if (score >= 0.3)  return "Positive 😊";
    if (score <= -0.3) return "Negative 😞";
    return "Neutral 😐";
}

function sentimentBarColor(score: number | null): string {
    if (score === null) return "#94a3b8";
    if (score >= 0.3)  return "#22c55e";
    if (score <= -0.3) return "#ef4444";
    return "#f59e0b";
}

function pct(n: number): string {
    return `${Math.round(n * 100)}%`;
}

function stars(rating: number | null): string {
    if (rating === null) return "N/A";
    const full  = Math.round(rating);
    const empty = 5 - full;
    return "★".repeat(full) + "☆".repeat(empty) + ` (${rating.toFixed(1)})`;
}

// ─── Template ─────────────────────────────────────────────────────────────────

function getReportEmailHtml(data: EventReportEmailData): string {
    const sentimentBarWidth = data.sentimentScore !== null
        ? Math.round(((data.sentimentScore + 1) / 2) * 100)
        : 50;

    const themePills = data.topThemes
        .slice(0, 6)
        .map(
            (t) =>
                `<span style="display:inline-block;background:#ede9fe;color:#6d28d9;
                        border-radius:999px;padding:3px 12px;font-size:12px;
                        font-weight:600;margin:3px;">${t}</span>`,
        )
        .join("");

    // Render AI summary preserving newlines as <br>
    const summaryHtml = data.aiExecutiveSummary
        .split("\n")
        .map((line) => `<p style="margin:4px 0 8px;color:#374151;">${line || "&nbsp;"}</p>`)
        .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Event Analytics Report — ${data.eventTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

        <!-- ── Header ── -->
        <tr><td style="background:linear-gradient(135deg,#6d28d9 0%,#4f46e5 100%);padding:32px 40px;text-align:center;">
          <p style="margin:0 0 6px;font-size:13px;color:#c4b5fd;letter-spacing:1px;text-transform:uppercase;">Post-Event Report</p>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${data.eventTitle}</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#c4b5fd;">${data.eventDate} · ${data.organizationName}</p>
        </td></tr>

        <!-- ── Greeting ── -->
        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0;font-size:15px;color:#1f2937;">Hi ${data.recipientName ?? "there"},</p>
          <p style="margin:10px 0 0;font-size:14px;color:#4b5563;line-height:1.6;">
            Here is the automated post-event performance report for
            <strong>${data.eventTitle}</strong>. This report was generated
            24 hours after the event concluded.
          </p>
        </td></tr>

        <!-- ── Key Metrics ── -->
        <tr><td style="padding:24px 40px 0;">
          <h2 style="margin:0 0 16px;font-size:14px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.5px;">
            📊 Key Metrics
          </h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr style="background:#f5f3ff;">
              <td style="padding:12px 16px;font-size:13px;color:#374151;border-radius:8px 0 0 0;">Registrations</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#1f2937;text-align:right;border-radius:0 8px 0 0;">${data.totalRegistrations.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#374151;">Attendance</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#1f2937;text-align:right;">${data.totalAttendance.toLocaleString()} (${pct(data.attendanceRate)})</td>
            </tr>
            <tr style="background:#f5f3ff;">
              <td style="padding:12px 16px;font-size:13px;color:#374151;">Avg Rating</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#f59e0b;text-align:right;">${stars(data.avgRating)}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#374151;border-radius:0 0 0 8px;">Avg Watch Time</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#1f2937;text-align:right;border-radius:0 0 8px 0;">${data.avgDurationMins !== null ? `${data.avgDurationMins} mins` : "N/A"}</td>
            </tr>
            <tr style="background:#f5f3ff;">
              <td style="padding:12px 16px;font-size:13px;color:#374151;">Total Views</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#1f2937;text-align:right;">${data.viewsCount.toLocaleString()}</td>
            </tr>
          </table>
        </td></tr>

        <!-- ── Sentiment ── -->
        <tr><td style="padding:24px 40px 0;">
          <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.5px;">
            💬 Audience Sentiment
          </h2>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
            Overall: <strong style="color:${sentimentBarColor(data.sentimentScore)};">${sentimentLabel(data.sentimentScore)}</strong>
          </p>
          <!-- Sentiment bar -->
          <div style="background:#e5e7eb;border-radius:999px;height:10px;width:100%;overflow:hidden;">
            <div style="background:${sentimentBarColor(data.sentimentScore)};width:${sentimentBarWidth}%;height:100%;border-radius:999px;"></div>
          </div>
          <!-- Distribution breakdown -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
            <tr>
              <td style="font-size:12px;color:#22c55e;text-align:left;">👍 ${data.sentimentDistribution.positive}% Positive</td>
              <td style="font-size:12px;color:#f59e0b;text-align:center;">😐 ${data.sentimentDistribution.neutral}% Neutral</td>
              <td style="font-size:12px;color:#ef4444;text-align:right;">👎 ${data.sentimentDistribution.negative}% Negative</td>
            </tr>
          </table>
        </td></tr>

        <!-- ── Top Themes ── -->
        ${data.topThemes.length > 0 ? `
        <tr><td style="padding:20px 40px 0;">
          <h2 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.5px;">
            🏷 Top Themes
          </h2>
          <div>${themePills}</div>
        </td></tr>` : ""}

        <!-- ── AI Executive Summary ── -->
        <tr><td style="padding:24px 40px 0;">
          <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.5px;">
            🤖 AI Executive Summary
          </h2>
          <div style="background:#f5f3ff;border-left:4px solid #7c3aed;border-radius:0 8px 8px 0;padding:16px 20px;">
            ${summaryHtml}
          </div>
        </td></tr>

        <!-- ── CTA ── -->
        <tr><td style="padding:28px 40px;text-align:center;">
          <a href="${data.reportUrl}"
             style="display:inline-block;background:#6d28d9;color:#ffffff;text-decoration:none;
                    padding:13px 32px;border-radius:8px;font-weight:600;font-size:14px;">
            View Full Report →
          </a>
        </td></tr>

        <!-- ── Footer ── -->
        <tr><td style="border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            This report was automatically generated by CorpConnect. Do not reply to this email.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Sender ───────────────────────────────────────────────────────────────────

export async function sendEventReportEmail(data: EventReportEmailData): Promise<void> {
    const html = getReportEmailHtml(data);
    await sendMail({
        email:        process.env.SENDER_EMAIL ?? "noreply@corpconnect.app",
        sendTo:       data.recipientEmail,
        subject:      `Post-Event Report: ${data.eventTitle}`,
        html,
        templateType: "EVENT_REPORT",
        payload:      {
            eventId:    data.eventId,
            eventTitle: data.eventTitle,
        },
    });
}

export { getReportEmailHtml };
