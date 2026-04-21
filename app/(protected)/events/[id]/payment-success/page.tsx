/**
 * app/(protected)/events/[id]/payment-success/page.tsx
 *
 * Stripe redirects here after a successful checkout.
 * URL: /events/[id]/payment-success?session_id=cs_...
 *
 * Responsibilities:
 *  1. Verify the Stripe session is actually paid (server-side, never trust the URL alone).
 *  2. Optimistically confirm the EventParticipation + EventPayment in DB
 *     (the webhook will also fire — the upsert / updateMany guards against double-writes).
 *  3. Render a polished success screen with event details + CTA.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/payment/stripe";
import Link from "next/link";
import { CheckCircle2, Calendar, ArrowRight, Home } from "lucide-react";

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ session_id?: string }>;
}

export default async function PaymentSuccessPage({ params, searchParams }: Props) {
    const { id: eventId } = await params;
    const { session_id } = await searchParams;

    const session = await auth();
    if (!session?.user?.id) redirect(`/events/${eventId}`);

    // ── 1. Verify the Stripe session ──────────────────────────────────────────
    if (!session_id) redirect(`/events/${eventId}`);

    let stripeSession: any;
    try {
        const stripe = getStripe();
        stripeSession = await stripe.checkout.sessions.retrieve(session_id, {
            expand: ["payment_intent"],
        });
    } catch {
        redirect(`/events/${eventId}`);
    }

    // Extra safety — must be paid
    if (stripeSession.payment_status !== "paid") {
        redirect(`/events/${eventId}`);
    }

    const participationId = stripeSession.metadata?.participationId as string | undefined;
    const userId = stripeSession.metadata?.userId as string | undefined;

    // ── 2. Optimistic DB confirmation (webhook may arrive later) ───────────────
    if (participationId && userId === session.user.id) {
        await prisma.$transaction(async (tx) => {
            await tx.eventParticipation.updateMany({
                where: {
                    id: participationId,
                    status: "PENDING_PAYMENT", // only update if still pending
                },
                data: { isPaid: true, status: "REGISTERED" },
            });

            const pi = stripeSession.payment_intent;
            const piId = typeof pi === "string" ? pi : pi?.id;
            const receiptUrl =
                typeof pi === "object"
                    ? (pi as any)?.charges?.data?.[0]?.receipt_url ?? null
                    : null;

            if (piId) {
                await tx.eventPayment.updateMany({
                    where: { participationId },
                    data: { status: "SUCCEEDED", receiptUrl },
                });
            }
        });
    }

    // ── 3. Load event details for the success screen ──────────────────────────
    const event = await prisma.events.findUnique({
        where: { id: eventId },
        select: {
            title: true,
            startDateTime: true,
            location: true,
            image: true,
            organization: { select: { name: true } },
        },
    });

    if (!event) redirect("/events");

    const formattedDate = new Intl.DateTimeFormat("en-IN", {
        dateStyle: "full",
        timeStyle: "short",
    }).format(new Date(event.startDateTime));

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Card */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    {/* Header stripe */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2" />

                    <div className="p-8 text-center">
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                                <CheckCircle2
                                    className="h-12 w-12 text-green-500"
                                    strokeWidth={1.5}
                                />
                                {/* Pulse ring */}
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-200 opacity-50" />
                            </span>
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            You&apos;re registered!
                        </h1>
                        <p className="text-gray-500 text-sm mb-8">
                            Payment confirmed. Your spot has been secured for this event.
                        </p>

                        {/* Event info card */}
                        <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-3 mb-8">
                            <h2 className="font-semibold text-gray-900 text-base leading-snug">
                                {event.title}
                            </h2>
                            {event.organization && (
                                <p className="text-xs text-indigo-600 font-medium">
                                    Hosted by {event.organization.name}
                                </p>
                            )}
                            <div className="flex items-start gap-2 text-sm text-gray-600">
                                <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                                <span>{formattedDate}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="text-gray-400 text-xs mt-0.5">📍</span>
                                <span>{event.location}</span>
                            </div>
                        </div>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link
                                href={`/events/${eventId}`}
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <Home className="h-4 w-4" />
                                Event Page
                            </Link>
                            <Link
                                href="/events"
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                            >
                                Explore Events
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400 mt-4">
                    A receipt has been sent to your email address.
                </p>
            </div>
        </div>
    );
}
