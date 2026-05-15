import { Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import { SignJWT } from "jose";

export async function mapTokenToSession(session: Session, token: JWT): Promise<Session> {
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
        session.user.apiTier = token.apiTier ?? "FREE";
    }

    if (token.sub && token.activeOrganizationId && process.env.AUTH_SECRET) {
        const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
        session.wsToken = await new SignJWT({
            userId: token.sub,
            activeOrgId: token.activeOrganizationId,
        })
            .setProtectedHeader({ alg: process.env.HASHING_ALGO || "HS256" })
            .setIssuedAt()
            .setExpirationTime("5m")
            .sign(secret);
    }

    return session;
}
