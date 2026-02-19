import { UserRole } from "@prisma/client"
import NextAuth, { type DefaultSession } from "next-auth"

export type ExtendedUser = DefaultSession["user"] & {
    role: UserRole;
    isAppAdmin: boolean;
}

declare module "next-auth" {
    interface Session {
        id: string
        user: ExtendedUser
    }
}
