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
import { confirmPaidParticipation } from "@/domain/billing";
import { getEventSummary } from "@/domain/events";
import { getStripe } from "@/lib/payment/stripe";
import Link from "next/link";
import { CheckCircle2, Calendar, ArrowRight, Home, MapPin } from "lucide-react";

interface Props {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ session_id?: string }>;
}

export default async function PaymentSuccessPage({
	params,
	searchParams,
}: Props) {
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

	const participationId = stripeSession.metadata?.participationId as
		| string
		| undefined;
	const userId = stripeSession.metadata?.userId as string | undefined;

	// ── 2. Optimistic DB confirmation (webhook may arrive later) ───────────────
	if (participationId && userId === session.user.id) {
		const pi = stripeSession.payment_intent;
		const receiptUrl =
			typeof pi === "object"
				? ((pi as any)?.charges?.data?.[0]?.receipt_url ?? null)
				: null;

		await confirmPaidParticipation({
			participationId,
			paymentIntentId: typeof pi === "string" ? pi : (pi?.id ?? null),
			receiptUrl,
		});
	}

	// ── 3. Load event details for the success screen ──────────────────────────
	const event = await getEventSummary(eventId);

	if (!event) redirect("/events");

	const formattedDate = new Intl.DateTimeFormat("en-IN", {
		dateStyle: "full",
		timeStyle: "short",
	}).format(new Date(event.startDateTime));

	return (
		<div className="min-h-screen bg-gradient-to-br from-nx-surface-container-low via-nx-surface to-nx-secondary-container flex items-center justify-center p-4 text-nx-on-surface">
			<div className="w-full max-w-lg">
				{/* Card */}
				<div className="bg-nx-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden">
					{/* Header stripe */}
					<div className="bg-gradient-to-r from-nx-tertiary to-nx-primary h-2" />

					<div className="p-8 text-center">
						{/* Icon */}
						<div className="flex justify-center mb-6">
							<span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-nx-success-container">
								<CheckCircle2
									className="h-12 w-12 text-nx-success"
									strokeWidth={1.5}
									aria-hidden="true"
								/>
								{/* Pulse ring */}
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-nx-success-container opacity-50" />
							</span>
						</div>

						<h1 className="text-2xl font-bold text-nx-on-surface mb-2">
							You&apos;re registered!
						</h1>
						<p className="text-nx-on-surface-variant text-sm mb-8">
							Payment confirmed. Your spot has been secured for this event.
						</p>

						{/* Event info card */}
						<div className="bg-nx-surface-container-low rounded-2xl p-5 text-left space-y-3 mb-8">
							<h2 className="font-semibold text-nx-on-surface text-base leading-snug">
								{event.title}
							</h2>
							{event.organization && (
								<p className="text-xs text-nx-tertiary font-medium">
									Hosted by {event.organization.name}
								</p>
							)}
							<div className="flex items-start gap-2 text-sm text-nx-on-surface-variant">
								<Calendar className="h-4 w-4 mt-0.5 shrink-0 text-nx-outline" />
								<span>{formattedDate}</span>
							</div>
							<div className="flex items-start gap-2 text-sm text-nx-on-surface-variant">
								<span className="text-nx-outline text-xs mt-0.5">📍</span>
								<span>{event.location}</span>
							</div>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row">
							<Link
								href={`/events/${eventId}`}
								className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-nx-outline-variant/30 px-4 py-3 text-sm font-medium text-nx-on-surface hover:bg-nx-surface-container transition-colors"
							>
								<Home className="h-4 w-4 shrink-0" aria-hidden="true" />
								Event Page
							</Link>
							<Link
								href="/events"
								className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-nx-primary px-4 py-3 text-sm font-medium text-nx-on-primary hover:bg-nx-primary/90 transition-colors"
							>
								Explore Events
								<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
							</Link>
						</div>
					</div>
				</div>

				<p className="text-center text-xs text-nx-on-surface-variant mt-4">
					A receipt has been sent to your email address.
				</p>
			</div>
		</div>
	);
}
