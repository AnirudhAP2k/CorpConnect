import { NextRequest, NextResponse } from "next/server";
import { resetSchema } from "@/domain/users";
import { requestPasswordResetAction } from "@/domain/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const POST = async (req: NextRequest) => {
    try {
        // Throttle reset requests per IP to prevent email bombing / enumeration.
        const limit = rateLimit(`password-reset:${getClientIp(req)}`, {
            limit: 5,
            windowMs: 60 * 60 * 1000,
        });
        if (!limit.success) {
            return NextResponse.json(
                { error: "Too many password reset requests. Please try again later." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
            );
        }

        const data = await req.json();
        const parsed = resetSchema.safeParse(data);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
        }

        const result = await requestPasswordResetAction(parsed.data.email);

        if ("error" in result) {
            const status = result.error.includes("No account") ? 404 : 400;
            return NextResponse.json({ error: result.error }, { status });
        }

        return NextResponse.json({ message: result.message }, { status: 200 });
    } catch (error) {
        console.error("[POST /api/auth/password-reset]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};