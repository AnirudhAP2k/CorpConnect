"use server";

import { Resend } from "resend";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const SENDER_EMAIL = process.env.SENDER_EMAIL ?? "noreply@corpconnect.com";

const resend = new Resend(RESEND_API_KEY);

interface SendMailOptions {
  /** From address (defaults to SENDER_EMAIL env var) */
  email: string;
  /** To address */
  sendTo?: string;
  subject: string;
  html?: string;
  /**
   * Template metadata for the EmailLog row.
   * Provide these whenever possible so the log is meaningful.
   */
  templateType?: string;
  /** The data object that was passed to the template function */
  payload?: Record<string, unknown>;
}

/**
 * Send an email via Resend and write a structured row to the EmailLog table.
 * Never throws — logs the error and returns null on failure.
 */
export async function sendMail({
  email,
  sendTo,
  subject,
  html,
  templateType = "UNKNOWN",
  payload = {},
}: SendMailOptions) {
  const startMs = Date.now();
  let status: "SENT" | "FAILED" = "FAILED";
  let messageId: string | null = null;
  let errorMessage: string | null = null;

  if (!RESEND_API_KEY) {
    errorMessage = "RESEND_API_KEY is not configured";
    console.error("[Mailer]", errorMessage);

    await logEmail({
      fromAddress: email,
      toAddress: sendTo ?? "",
      subject,
      templateType,
      payload,
      status: "FAILED",
      messageId: null,
      errorMessage,
      durationMs: Date.now() - startMs,
    });

    return null;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: email || SENDER_EMAIL,
      to: sendTo ? [sendTo] : [],
      subject,
      html: html ?? "",
    });

    if (error) {
      errorMessage = error.message ?? JSON.stringify(error);
      console.error("[Mailer] Resend API error →", sendTo, ":", errorMessage);
    } else if (data) {
      messageId = data.id ?? null;
      status = "SENT";
      console.log("[Mailer] Message sent:", messageId, "→", sendTo);
    }
  } catch (error: any) {
    errorMessage = error?.message ?? String(error);
    console.error("[Mailer] Send failed →", sendTo, ":", errorMessage);
  }

  const durationMs = Date.now() - startMs;

  await logEmail({
    fromAddress: email,
    toAddress: sendTo ?? "",
    subject,
    templateType,
    payload,
    status,
    messageId,
    errorMessage,
    durationMs,
  });

  return status === "SENT" ? { messageId } : null;
}

// ─── Internal log writer ──────────────────────────────────────────────────────

interface EmailLogEntry {
  fromAddress: string;
  toAddress: string;
  subject: string;
  templateType: string;
  payload: Record<string, unknown>;
  status: "SENT" | "FAILED";
  messageId: string | null;
  errorMessage: string | null;
  durationMs: number;
}

async function logEmail(entry: EmailLogEntry) {
  try {
    await prisma.emailLog.create({
      data: {
        fromAddress: entry.fromAddress,
        toAddress: entry.toAddress,
        subject: entry.subject,
        templateType: entry.templateType,
        payload: entry.payload as Prisma.InputJsonValue,
        smtpHost: null,
        smtpService: "resend",
        status: entry.status,
        messageId: entry.messageId,
        errorMessage: entry.errorMessage,
        durationMs: entry.durationMs,
      },
    });
  } catch (logError: any) {
    // Never let logging failure break the caller
    console.error("[Mailer] Failed to write EmailLog:", logError?.message);
  }
}