import { Session } from "next-auth";
import { JWT } from "next-auth/jwt";

export function mapTokenToSession(session: Session, token: JWT): Session {
    if (token.sub && session.user) {
        session.user.id = token.sub;
    }

    if (token.role && session.user) {
        session.user.role = token.role;
    }

    if (session.user) {
        session.user.isAppAdmin = token.isAppAdmin ?? false;
        session.user.hasCompletedOnboarding = token.hasCompletedOnboarding ?? false;
        session.user.activeOrganizationId = token.activeOrganizationId ?? null;
    }

    return session;
}
