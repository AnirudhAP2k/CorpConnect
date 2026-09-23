/**
 * Stripe Connect Express onboarding and status for USD PLATFORM ticket payouts.
 * Razorpay Route is Phase 2 — do not store seller accounts on razorpayCustomerId.
 */

import { prisma } from "@/lib/db";
import { BillingError } from "./errors";
import {
	createConnectAccountOnboardingLink,
	createConnectExpressLoginLink,
	createExpressConnectedAccount,
	retrieveConnectAccount,
} from "./gateway/stripe.adapter";
import { paymentIdempotencyKey, resolveIdempotencyKey } from "@/lib/payment/idempotency";

const appUrl = (): string => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type StripeConnectStatus = {
	connectedAccountId: string | null;
	chargesEnabled: boolean;
	payoutsEnabled: boolean;
	detailsSubmitted: boolean;
	readyForUsdPayouts: boolean;
};

export function isStripeConnectReady(org: {
	stripeConnectedAccountId: string | null;
	stripeChargesEnabled: boolean;
}): boolean {
	return Boolean(org.stripeConnectedAccountId && org.stripeChargesEnabled);
}

export function usdPlatformConnectError(org: {
	stripeConnectedAccountId: string | null;
	stripeChargesEnabled: boolean;
}): string | null {
	if (isStripeConnectReady(org)) return null;
	return "Connect Stripe payouts on the billing page before collecting USD PLATFORM ticket payments.";
}

function stripeConnectCountry(jurisdiction: string | null | undefined): string {
	const code = (jurisdiction ?? "").trim().toUpperCase();
	if (/^[A-Z]{2}$/.test(code)) return code;
	return "US";
}

async function resolveConnectOrg(userId: string) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { activeOrganizationId: true },
	});
	if (!user?.activeOrganizationId) {
		throw new BillingError(400, "No active organization. Please select an organization first.");
	}

	const orgId = user.activeOrganizationId;
	const membership = await prisma.organizationMember.findUnique({
		where: { userId_organizationId: { userId, organizationId: orgId } },
		select: { role: true },
	});
	if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
		throw new BillingError(403, "Only OWNER or ADMIN can manage billing");
	}

	const org = await prisma.organization.findUnique({
		where: { id: orgId },
		select: {
			id: true,
			name: true,
			stripeConnectedAccountId: true,
			stripeChargesEnabled: true,
			stripePayoutsEnabled: true,
			stripeDetailsSubmitted: true,
			meta: { select: { jurisdiction: true } },
		},
	});
	if (!org) {
		throw new BillingError(404, "Organization not found");
	}

	return org;
}

function toStatus(org: {
	stripeConnectedAccountId: string | null;
	stripeChargesEnabled: boolean;
	stripePayoutsEnabled: boolean;
	stripeDetailsSubmitted: boolean;
}): StripeConnectStatus {
	return {
		connectedAccountId: org.stripeConnectedAccountId,
		chargesEnabled: org.stripeChargesEnabled,
		payoutsEnabled: org.stripePayoutsEnabled,
		detailsSubmitted: org.stripeDetailsSubmitted,
		readyForUsdPayouts: isStripeConnectReady(org),
	};
}

export async function getStripeConnectStatus(userId: string): Promise<StripeConnectStatus> {
	return toStatus(await resolveConnectOrg(userId));
}

export async function createStripeConnectOnboardingLink(
	userId: string,
	idempotencyKey?: string,
): Promise<{ url: string }> {
	const org = await resolveConnectOrg(userId);
	let accountId = org.stripeConnectedAccountId;

	if (!accountId) {
		const created = await createExpressConnectedAccount({
			orgId: org.id,
			name: org.name,
			country: stripeConnectCountry(org.meta?.jurisdiction),
			idempotencyKey: resolveIdempotencyKey(
				idempotencyKey,
				paymentIdempotencyKey("connect", "stripe", org.id),
			),
		});
		accountId = created.id;
		await prisma.organization.update({
			where: { id: org.id },
			data: { stripeConnectedAccountId: accountId },
		});
	}

	const base = appUrl();
	return createConnectAccountOnboardingLink({
		accountId,
		refreshUrl: `${base}/billing?connect=refresh`,
		returnUrl: `${base}/billing?connect=return`,
	});
}

export async function syncStripeConnectAccount(userId: string): Promise<StripeConnectStatus> {
	const org = await resolveConnectOrg(userId);
	if (!org.stripeConnectedAccountId) {
		throw new BillingError(400, "No Stripe Connect account to sync. Start onboarding first.");
	}

	const account = await retrieveConnectAccount(org.stripeConnectedAccountId);
	const updated = await prisma.organization.update({
		where: { id: org.id },
		data: {
			stripeConnectedAccountId: account.id,
			stripeChargesEnabled: account.chargesEnabled,
			stripePayoutsEnabled: account.payoutsEnabled,
			stripeDetailsSubmitted: account.detailsSubmitted,
		},
		select: {
			stripeConnectedAccountId: true,
			stripeChargesEnabled: true,
			stripePayoutsEnabled: true,
			stripeDetailsSubmitted: true,
		},
	});

	return toStatus(updated);
}

export async function createStripeConnectDashboardLink(userId: string): Promise<{ url: string }> {
	const org = await resolveConnectOrg(userId);
	if (!org.stripeConnectedAccountId) {
		throw new BillingError(400, "Connect Stripe payouts before opening the Express dashboard.");
	}
	if (!org.stripeDetailsSubmitted) {
		throw new BillingError(400, "Finish Stripe onboarding before opening the Express dashboard.");
	}
	return createConnectExpressLoginLink(org.stripeConnectedAccountId);
}
