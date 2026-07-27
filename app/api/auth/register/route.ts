import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/domain/users";
import { registerAction } from "@/domain/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const POST = async (req: NextRequest) => {
    try {
        // Throttle account creation per IP to prevent mass/spam sign-ups.
        const limit = rateLimit(`register:${getClientIp(req)}`, {
            limit: 5,
            windowMs: 60 * 60 * 1000,
        });
        if (!limit.success) {
            return NextResponse.json(
                { error: "Too many sign-up attempts. Please try again later." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
            );
        }

        const data = await req.json();
        const parsed = registerSchema.safeParse(data);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
        }

        const result = await registerAction(parsed.data);

        if ("error" in result) {
            const status = result.error.includes("already exists") ? 409 : 400;
            return NextResponse.json({ error: result.error }, { status });
        }

        return NextResponse.json({ message: result.message }, { status: 201 });
    } catch (error) {
        console.error("[POST /api/auth/register]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};
