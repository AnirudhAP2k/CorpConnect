import { OrganizationRole } from "@prisma/client"
import NextAuth, { type DefaultSession } from "next-auth"

export type ExtendedUser =
    {
        id: string
    } & DefaultSession["user"] & {
        role: OrganizationRole;
        isAppAdmin: boolean;
        hasCompletedOnboarding: boolean;
        activeOrganizationId: string | null;
        emailVerified: Date | null;
    }

declare module "next-auth" {
    interface Session {
        id: string
        user: ExtendedUser
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        sub?: string;
        role?: OrganizationRole | null;
        isAppAdmin?: boolean;
        hasCompletedOnboarding?: boolean;
        activeOrganizationId?: string | null;
    }
}
