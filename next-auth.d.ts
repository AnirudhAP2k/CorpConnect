import { OrganizationRole } from "@prisma/client"
import { DefaultSession } from "next-auth"

export type ExtendedUser =
    {
        id: string;
    } & DefaultSession["user"] & {
        role?: OrganizationRole | null;
        isAppAdmin?: boolean;
        hasCompletedOnboarding?: boolean;
        activeOrganizationId?: string | null;
        emailVerified?: Date | null;
    }

declare module "next-auth" {
    interface Session {
        id: string
        user: ExtendedUser
        error?: string | null;
    }

    interface User {
        role?: OrganizationRole | null;
        isAppAdmin?: boolean;
        hasCompletedOnboarding?: boolean;
        activeOrganizationId?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        sub: string;
        role?: OrganizationRole | null;
        isAppAdmin?: boolean;
        hasCompletedOnboarding?: boolean;
        activeOrganizationId?: string | null;
        refreshToken?: string;
        accessTokenExpires?: number;
        error?: string | null;
    }
}
