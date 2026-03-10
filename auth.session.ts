import { OrganizationRole } from "@prisma/client";

export function mapTokenToSession(session: any, token: any) {
    if (token.sub && session.user) {
        session.user.id = token.sub;
    }

    if (token.role && session.user) {
        session.user.role = token.role as OrganizationRole;
    }

    if (session.user) {
        session.user.isAppAdmin = (token.isAppAdmin as boolean) ?? false;
        session.user.hasCompletedOnboarding =
            (token.hasCompletedOnboarding as boolean) ?? false;

        session.user.activeOrganizationId =
            (token.activeOrganizationId as string | null) ?? null;
    }

    return session;
}