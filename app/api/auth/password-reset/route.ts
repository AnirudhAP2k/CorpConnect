import { NextRequest, NextResponse } from "next/server";
import { resetSchema } from "@/domain/users";
import { requestPasswordResetAction } from "@/domain/auth";

export const POST = async (req: NextRequest) => {
    try {
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