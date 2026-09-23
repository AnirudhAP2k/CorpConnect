/**
 * @jest-environment node
 *
 * Stripe Connect onboarding service (Express accounts).
 */

import {
    createStripeConnectOnboardingLink,
    syncStripeConnectAccount,
    usdPlatformConnectError,
} from "@/domain/billing/connect";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/payment/stripe";

jest.mock("@/lib/db", () => ({
    prisma: {
        user: { findUnique: jest.fn() },
        organizationMember: { findUnique: jest.fn() },
        organization: { findUnique: jest.fn(), update: jest.fn() },
    },
}));

jest.mock("@/lib/payment/stripe", () => ({
    getStripe: jest.fn(),
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ORG_ID = "22222222-2222-4222-8222-222222222222";

function mockOwnerOrg(overrides: Record<string, unknown> = {}) {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ activeOrganizationId: ORG_ID });
    (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue({ role: "OWNER" });
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: ORG_ID,
        name: "Acme",
        stripeConnectedAccountId: null,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
        meta: { jurisdiction: "US" },
        ...overrides,
    });
}

describe("usdPlatformConnectError", () => {
    it("returns a message until charges are enabled on a connected account", () => {
        expect(
            usdPlatformConnectError({
                stripeConnectedAccountId: null,
                stripeChargesEnabled: false,
            }),
        ).toMatch(/Connect Stripe payouts/);
        expect(
            usdPlatformConnectError({
                stripeConnectedAccountId: "acct_1",
                stripeChargesEnabled: true,
            }),
        ).toBeNull();
    });
});

describe("createStripeConnectOnboardingLink", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockOwnerOrg();
        (prisma.organization.update as jest.Mock).mockResolvedValue({});
    });

    it("creates an Express account and Account Link", async () => {
        const accountsCreate = jest.fn().mockResolvedValue({ id: "acct_new" });
        const accountLinksCreate = jest.fn().mockResolvedValue({
            url: "https://connect.stripe.com/setup/s/abc",
        });
        (getStripe as jest.Mock).mockReturnValue({
            accounts: { create: accountsCreate },
            accountLinks: { create: accountLinksCreate },
        });

        const result = await createStripeConnectOnboardingLink(USER_ID);

        expect(accountsCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "express",
                country: "US",
                metadata: { orgId: ORG_ID },
            }),
            { idempotencyKey: `connect:stripe:${ORG_ID}` },
        );
        expect(prisma.organization.update).toHaveBeenCalledWith({
            where: { id: ORG_ID },
            data: { stripeConnectedAccountId: "acct_new" },
        });
        expect(accountLinksCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                account: "acct_new",
                type: "account_onboarding",
            }),
        );
        expect(result.url).toBe("https://connect.stripe.com/setup/s/abc");
    });

    it("reuses an existing connected account id", async () => {
        mockOwnerOrg({ stripeConnectedAccountId: "acct_existing" });
        const accountsCreate = jest.fn();
        const accountLinksCreate = jest.fn().mockResolvedValue({
            url: "https://connect.stripe.com/setup/s/retry",
        });
        (getStripe as jest.Mock).mockReturnValue({
            accounts: { create: accountsCreate },
            accountLinks: { create: accountLinksCreate },
        });

        await createStripeConnectOnboardingLink(USER_ID);

        expect(accountsCreate).not.toHaveBeenCalled();
        expect(accountLinksCreate).toHaveBeenCalledWith(
            expect.objectContaining({ account: "acct_existing" }),
        );
    });
});

describe("syncStripeConnectAccount", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("writes Stripe capability flags onto the org", async () => {
        mockOwnerOrg({ stripeConnectedAccountId: "acct_1" });
        (getStripe as jest.Mock).mockReturnValue({
            accounts: {
                retrieve: jest.fn().mockResolvedValue({
                    id: "acct_1",
                    charges_enabled: true,
                    payouts_enabled: false,
                    details_submitted: true,
                    metadata: { orgId: ORG_ID },
                }),
            },
        });
        (prisma.organization.update as jest.Mock).mockResolvedValue({
            stripeConnectedAccountId: "acct_1",
            stripeChargesEnabled: true,
            stripePayoutsEnabled: false,
            stripeDetailsSubmitted: true,
        });

        const status = await syncStripeConnectAccount(USER_ID);

        expect(prisma.organization.update).toHaveBeenCalledWith({
            where: { id: ORG_ID },
            data: {
                stripeConnectedAccountId: "acct_1",
                stripeChargesEnabled: true,
                stripePayoutsEnabled: false,
                stripeDetailsSubmitted: true,
            },
            select: {
                stripeConnectedAccountId: true,
                stripeChargesEnabled: true,
                stripePayoutsEnabled: true,
                stripeDetailsSubmitted: true,
            },
        });
        expect(status.readyForUsdPayouts).toBe(true);
    });
});
