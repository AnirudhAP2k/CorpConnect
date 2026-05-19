import { getUserActiveOrgRole, getFreshSessionUser } from "@/domain/users/queries";
import { prisma } from "@/lib/db";

// Mock the prisma client
jest.mock("@/lib/db", () => ({
    prisma: {
        organizationMember: {
            findUnique: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
    },
}));

describe("Users Domain Queries", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getUserActiveOrgRole", () => {
        it("should return the organization role when membership exists", async () => {
            const mockMembership = { role: "ADMIN" };
            (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue(mockMembership);

            const role = await getUserActiveOrgRole("user-123", "org-456");

            expect(role).toBe("ADMIN");
            expect(prisma.organizationMember.findUnique).toHaveBeenCalledWith({
                where: {
                    userId_organizationId: {
                        userId: "user-123",
                        organizationId: "org-456",
                    },
                },
                select: { role: true },
            });
        });

        it("should return null if no active organization ID is provided", async () => {
            const role = await getUserActiveOrgRole("user-123", null);

            expect(role).toBeNull();
            expect(prisma.organizationMember.findUnique).not.toHaveBeenCalled();
        });

        it("should return null if organization membership is not found", async () => {
            (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue(null);

            const role = await getUserActiveOrgRole("user-123", "org-456");

            expect(role).toBeNull();
        });
    });

    describe("getFreshSessionUser", () => {
        it("should return minimal user fields and the organization role when user exists", async () => {
            const mockUser = {
                id: "user-123",
                isAppAdmin: false,
                hasCompletedOnboarding: true,
                activeOrganizationId: "org-456",
                organizationMemberships: [{ role: "MEMBER" }],
            };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

            const result = await getFreshSessionUser("user-123", "org-456");

            expect(result).toEqual({
                id: "user-123",
                isAppAdmin: false,
                hasCompletedOnboarding: true,
                activeOrganizationId: "org-456",
                role: "MEMBER",
            });
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: "user-123" },
                select: {
                    id: true,
                    isAppAdmin: true,
                    hasCompletedOnboarding: true,
                    activeOrganizationId: true,
                    organizationMemberships: {
                        where: { organizationId: "org-456" },
                        select: { role: true },
                        take: 1,
                    },
                },
            });
        });

        it("should return null if user does not exist", async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await getFreshSessionUser("user-123", "org-456");

            expect(result).toBeNull();
        });

        it("should default role to null if user has no membership in the active organization", async () => {
            const mockUser = {
                id: "user-123",
                isAppAdmin: false,
                hasCompletedOnboarding: true,
                activeOrganizationId: "org-456",
                organizationMemberships: [],
            };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

            const result = await getFreshSessionUser("user-123", "org-456");

            expect(result).toEqual({
                id: "user-123",
                isAppAdmin: false,
                hasCompletedOnboarding: true,
                activeOrganizationId: "org-456",
                role: null,
            });
        });
    });
});
