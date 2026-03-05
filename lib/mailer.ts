"use server";

import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const SMTP_SERVER_HOST = process.env.SMTP_SERVER_HOST ?? "";
const SENDER_EMAIL = process.env.SENDER_EMAIL ?? "noreply@evently.com";
const SMTP_TRANSPORTER_SERVICE = process.env.SMTP_TRANSPORTER_SERVICE ?? "";
const SMTP_SERVER_USERNAME = process.env.SMTP_SERVER_USERNAME ?? "";
const SMTP_SERVER_PASSWORD = process.env.SMTP_SERVER_PASSWORD ?? "";

const transporter = nodemailer.createTransport({
  service: SMTP_TRANSPORTER_SERVICE || undefined,
  host: SMTP_TRANSPORTER_SERVICE ? undefined : SMTP_SERVER_HOST,
  port: 465,
  secure: true,
  auth: {
    user: SMTP_SERVER_USERNAME,
    pass: SMTP_SERVER_PASSWORD,
  },
});

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
 * Send an email and write a structured row to the EmailLog table.
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
  let info: Awaited<ReturnType<typeof transporter.sendMail>> | null = null;

  try {
    await transporter.verify();
  } catch (error: any) {
    console.error("[Mailer] SMTP verification failed:", SMTP_SERVER_USERNAME, error?.message);
    errorMessage = `SMTP verify failed: ${error?.message ?? String(error)}`;

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
    info = await transporter.sendMail({
      from: email,
      to: sendTo,
      subject,
      html: html ?? "",
    });

    messageId = info.messageId ?? null;
    status = "SENT";
    console.log("[Mailer] Message sent:", messageId, "→", sendTo);
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

  return info;
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
        smtpHost: SMTP_SERVER_HOST || null,
        smtpService: SMTP_TRANSPORTER_SERVICE || null,
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