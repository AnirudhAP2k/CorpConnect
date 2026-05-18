import { NextRequest, NextResponse } from "next/server";
import { verifyEmailAction } from "@/domain/auth";

export const GET = async (req: NextRequest) => {
    try {
        const token = req.nextUrl.searchParams.get("token");

        if (!token) {
            return NextResponse.json({ error: "Verification token missing." }, { status: 400 });
        }

        const result = await verifyEmailAction(token);

        if ("error" in result) {
            const status = result.error.includes("expired") ? 410 : 400;
            return NextResponse.json({ error: result.error }, { status });
        }

        return NextResponse.json({ message: result.message }, { status: 201 });
    } catch (error) {
        console.error("[GET /api/auth/token-verification]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};
