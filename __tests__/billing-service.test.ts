/**
 * Tests for domain/billing/service.ts
 *
 * Verifies billing authorization rules (active org, OWNER/ADMIN gate) and that
 * business logic delegates to the correct payment gateway.
 */

import { createBillingCheckout, createBillingPortal, getBillingStatus } from "@/domain/billing/service";
import { BillingError } from "@/domain/billing/errors";
import { getPaymentGateway } from "@/domain/billing/gateway";
import { prisma } from "@/lib/db";

jest.mock("@/lib/db", () => ({
    prisma: {
        user: { findUnique: jest.fn() },
        organizationMember: { findUnique: jest.fn() },
        organization: { findUnique: jest.fn() },
        orgSubscription: { findFirst: jest.fn() },
    },
}));

jest.mock("@/domain/billing/gateway", () => ({
    getPaymentGateway: jest.fn(),
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ORG_ID = "22222222-2222-4222-8222-222222222222";

const mockOrg = {
    id: ORG_ID,
    name: "Acme Corp",
    stripeCustomerId: "cus_123",
    razorpayCustomerId: null,
};

function mockResolvedBillingOrg(role: string = "OWNER") {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ activeOrganizationId: ORG_ID });
    (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({ role });
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg);
}

describe("Billing Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("createBillingCheckout", () => {
        it("throws 400 when the user has no active organization", async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ activeOrganizationId: null });

            await expect(
                createBillingCheckout({ userId: USER_ID, plan: "PRO", provider: "stripe" })
            ).rejects.toMatchObject({ status: 400 });
            expect(getPaymentGateway).not.toHaveBeenCalled();
        });

        it("throws 403 when the caller is not OWNER or ADMIN", async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ activeOrganizationId: ORG_ID });
            (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({ role: "MEMBER" });

            await expect(
                createBillingCheckout({ userId: USER_ID, plan: "PRO", provider: "stripe" })
            ).rejects.toMatchObject({ status: 403 });
        });

        it("throws 403 when the caller has no membership at all", async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ activeOrganizationId: ORG_ID });
            (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                createBillingCheckout({ userId: USER_ID, plan: "PRO", provider: "stripe" })
            ).rejects.toMatchObject({ status: 403 });
        });

        it("throws 404 when the organization does not exist", async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ activeOrganizationId: ORG_ID });
            (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({ role: "OWNER" });
            (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                createBillingCheckout({ userId: USER_ID, plan: "PRO", provider: "stripe" })
            ).rejects.toMatchObject({ status: 404 });
        });

        it("propagates BillingError instances (not generic errors)", async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                createBillingCheckout({ userId: USER_ID, plan: "PRO", provider: "stripe" })
            ).rejects.toBeInstanceOf(BillingError);
        });

        it("delegates to the gateway selected by the provider param", async () => {
            mockResolvedBillingOrg("ADMIN");
            const createSubscriptionCheckout = jest
                .fn()
                .mockResolvedValue({ url: "https://rzp.io/checkout" });
            (getPaymentGateway as jest.Mock).mockReturnValue({ createSubscriptionCheckout });

            const result = await createBillingCheckout({
                userId: USER_ID,
                plan: "ENTERPRISE",
                provider: "razorpay",
            });

            expect(getPaymentGateway).toHaveBeenCalledWith("razorpay");
            expect(createSubscriptionCheckout).toHaveBeenCalledWith({
                org: mockOrg,
                plan: "ENTERPRISE",
                appUrl: expect.any(String),
            });
            expect(result).toEqual({ url: "https://rzp.io/checkout" });
        });
    });

    describe("createBillingPortal", () => {
        it("always uses the Stripe gateway (portal is a Stripe capability)", async () => {
            mockResolvedBillingOrg("OWNER");
            const createPortalSession = jest
                .fn()
                .mockResolvedValue({ url: "https://billing.stripe.com/session" });
            (getPaymentGateway as jest.Mock).mockReturnValue({ createPortalSession });

            const result = await createBillingPortal(USER_ID);

            expect(getPaymentGateway).toHaveBeenCalledWith("stripe");
            expect(createPortalSession).toHaveBeenCalledWith(mockOrg, expect.any(String));
            expect(result).toEqual({ url: "https://billing.stripe.com/session" });
        });

        it("enforces the OWNER/ADMIN gate before touching the gateway", async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ activeOrganizationId: ORG_ID });
            (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({ role: "MEMBER" });

            await expect(createBillingPortal(USER_ID)).rejects.toMatchObject({ status: 403 });
            expect(getPaymentGateway).not.toHaveBeenCalled();
        });
    });

    describe("getBillingStatus", () => {
        it("throws 400 when no active organization is selected", async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ activeOrganizationId: null });

            await expect(getBillingStatus(USER_ID)).rejects.toMatchObject({ status: 400 });
        });

        it("throws 404 when the organization does not exist", async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ activeOrganizationId: ORG_ID });
            (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(getBillingStatus(USER_ID)).rejects.toMatchObject({ status: 404 });
        });

        it("returns plan info with the latest subscription", async () => {
            const expiresAt = new Date("2026-12-31T00:00:00Z");
            const periodEnd = new Date("2026-08-22T00:00:00Z");
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ activeOrganizationId: ORG_ID });
            (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
                subscriptionPlan: "PRO",
                subscriptionStatus: "ACTIVE",
                subscriptionExpiresAt: expiresAt,
                isVerified: true,
            });
            (prisma.orgSubscription.findFirst as jest.Mock).mockResolvedValue({
                provider: "STRIPE",
                plan: "PRO",
                status: "ACTIVE",
                currentPeriodEnd: periodEnd,
            });

            const status = await getBillingStatus(USER_ID);

            expect(status).toEqual({
                plan: "PRO",
                status: "ACTIVE",
                expiresAt,
                isVerified: true,
                latestSubscription: {
                    provider: "STRIPE",
                    plan: "PRO",
                    status: "ACTIVE",
                    currentPeriodEnd: periodEnd,
                },
            });
        });

        it("returns latestSubscription as null when the org never subscribed", async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ activeOrganizationId: ORG_ID });
            (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
                subscriptionPlan: "FREE",
                subscriptionStatus: null,
                subscriptionExpiresAt: null,
                isVerified: false,
            });
            (prisma.orgSubscription.findFirst as jest.Mock).mockResolvedValue(null);

            const status = await getBillingStatus(USER_ID);

            expect(status.plan).toBe("FREE");
            expect(status.latestSubscription).toBeNull();
        });
    });
});
