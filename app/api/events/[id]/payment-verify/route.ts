/**
 * app/api/events/[id]/payment-verify/route.ts
 *
 * POST /api/events/[id]/payment-verify
 * Body: { providerPaymentId: string, provider: "stripe" | "razorpay" }
 *
 * Belt-and-suspenders check called after the user is redirected back from checkout.
 * Verifies the payment was actually captured before confirming registration.
 * The webhook is authoritative; this is a fallback for redirect-based confirmation.
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/payment/stripe";
import { getRazorpay } from "@/lib/payment/razorpay";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id: eventId } = await params;

        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { providerPaymentId, provider } = body as {
            providerPaymentId: string;
            provider: "stripe" | "razorpay";
        };

        if (!providerPaymentId || !provider) {
            return NextResponse.json({ error: "providerPaymentId and provider are required" }, { status: 400 });
        }

        // Find the EventPayment and related participation
        const eventPayment = await prisma.eventPayment.findFirst({
            where: {
                providerPaymentId,
                eventId,
            },
            include: { participation: true },
        });

        if (!eventPayment) {
            return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
        }

        // Already confirmed by webhook — idempotent
        if (eventPayment.status === "SUCCEEDED") {
            return NextResponse.json({ status: "already_confirmed" }, { status: 200 });
        }

        let isCapture = false;

        if (provider === "stripe") {
            const stripe = getStripe();
            // For Stripe Checkout the providerPaymentId is the session id or payment_intent id
            let paymentIntentId = providerPaymentId;
            if (providerPaymentId.startsWith("cs_")) {
                const cs = await stripe.checkout.sessions.retrieve(providerPaymentId);
                paymentIntentId = cs.payment_intent as string;
            }
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
            isCapture = pi.status === "succeeded";
        } else {
            const razorpay = getRazorpay();
            const payment = await razorpay.payments.fetch(providerPaymentId);
            isCapture = payment.status === "captured";
        }

        if (!isCapture) {
            return NextResponse.json({ status: "pending", message: "Payment not yet confirmed" }, { status: 202 });
        }

        // Confirm
        await prisma.$transaction([
            prisma.eventPayment.update({
                where: { id: eventPayment.id },
                data: { status: "SUCCEEDED" },
            }),
            prisma.eventParticipation.update({
                where: { id: eventPayment.participationId },
                data: { isPaid: true, status: "REGISTERED" },
            }),
        ]);

        return NextResponse.json({ status: "confirmed" }, { status: 200 });
    } catch (error: any) {
        console.error("[payment-verify]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
