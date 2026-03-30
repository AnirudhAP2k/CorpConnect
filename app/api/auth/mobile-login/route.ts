import { NextResponse } from "next/server";
import { LoginSchema } from "@/lib/validation";
import { getUserByEmail } from "@/data/user";
import bcrypt from "bcryptjs";
import { generateRefreshToken } from "@/lib/tokens";
import { SignJWT } from "jose";

/**
 * Mobile Login Endpoint
 * 
 * Specifically for mobile clients that cannot handle cookies.
 * Validates credentials and returns raw Access and Refresh tokens in the JSON body.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validatedFields = LoginSchema.safeParse(body);

        if (!validatedFields.success) {
            return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
        }

        const { email, password, code } = validatedFields.data;

        const user = await getUserByEmail(email);

        // Standard checks (shared with web auth logic)
        if (!user || !user.email || !user.password) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        if (!user.emailVerified) {
            return NextResponse.json({ error: "Email not verified" }, { status: 403 });
        }

        // Two-Factor Authentication Logic
        if (user.isTwoFactorEnabled) {
            // If code is missing, inform the mobile app to show the 2FA input
            if (!code) {
                return NextResponse.json({
                    error: "Two-factor authentication required",
                    twoFactorRequired: true
                }, { status: 200 });
            }

            // TODO: Implement actual code verification if user provides it
            // This would call your existing getTwoFactorTokenbyEmail logic
        }

        // Generate persistent Refresh Token in DB
        const refreshTokenMetadata = await generateRefreshToken(
            user.id,
            req.headers.get("user-agent") || undefined,
            req.headers.get("x-forwarded-for") || undefined
        );

        // Generate Stateless Access Token (JWT)
        const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
        const accessToken = await new SignJWT({
            sub: user.id,
            role: user.role,
            isAppAdmin: user.isAppAdmin,
            hasCompletedOnboarding: user.hasCompletedOnboarding,
            activeOrganizationId: user.activeOrganizationId,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("15m")
            .sign(secret);

        return NextResponse.json({
            accessToken,
            refreshToken: refreshTokenMetadata.token,
            expiresAt: refreshTokenMetadata.expiresAt,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                image: user.image
            }
        });

    } catch (error) {
        console.error("Mobile login internal error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
