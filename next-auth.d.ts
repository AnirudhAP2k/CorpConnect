import { OrganizationRole } from "@prisma/client"
import NextAuth, { type DefaultSession } from "next-auth"

export type ExtendedUser = DefaultSession["user"] & {
    role: OrganizationRole;
    isAppAdmin: boolean;
    hasCompletedOnboarding: boolean;
    activeOrganizationId: string | null;
}

declare module "next-auth" {
    interface Session {
        id: string
        user: ExtendedUser
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: OrganizationRole;
        isAppAdmin?: boolean;
        hasCompletedOnboarding?: boolean;
        activeOrganizationId?: string | null;
    }
}
