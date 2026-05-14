/**
 * lib/jobs/payment-receipt.ts
 *
 * Sends a payment receipt email after a successful event payment.
 * Enqueued as SEND_PAYMENT_RECEIPT job.
 */

import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mailer";

export interface PaymentReceiptPayload {
    participationId: string;
    eventId: string;
    userId: string;
    amount: number;      // smallest unit (paise / cents)
    currency: string;
}

export async function processPaymentReceipt(payload: PaymentReceiptPayload): Promise<void> {
    const { participationId, eventId, userId, amount, currency } = payload;

    const [event, user] = await Promise.all([
        prisma.events.findUnique({
            where: { id: eventId },
            select: { title: true, startDateTime: true },
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
        }),
    ]);

    if (!event || !user?.email) {
        console.warn("[payment-receipt] Missing event or user — skipping");
        return;
    }

    // Format amount (divide by 100 for major currency unit)
    const displayAmount = (amount / 100).toFixed(2);
    const currencyLabel = currency.toUpperCase();

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Payment Confirmed ✓</h2>
          <p>Hi ${user.name ?? "there"},</p>
          <p>Your payment of <strong>${currencyLabel} ${displayAmount}</strong> for the event
             <strong>"${event.title}"</strong> has been confirmed.</p>
          <p style="color: #64748b;">Event Date: ${event.startDateTime.toLocaleDateString("en-IN", {
        dateStyle: "long",
    })}</p>
          <p>Your registration is now confirmed. See you there!</p>
          <hr style="border-color: #e2e8f0;" />
          <p style="font-size: 12px; color: #94a3b8;">
            This is an automated message from CorpConnect. Do not reply.
          </p>
        </div>
    `;

    await sendMail({
        email: process.env.SENDER_EMAIL ?? "noreply@corpconnect.app",
        sendTo: user.email,
        subject: `Payment Confirmed: ${event.title}`,
        html,
        templateType: "PAYMENT_RECEIPT",
        payload: { participationId, eventId, amount, currency },
    });

    console.log(`[payment-receipt] ✓ Sent receipt to ${user.email} for event ${eventId}`);
}
