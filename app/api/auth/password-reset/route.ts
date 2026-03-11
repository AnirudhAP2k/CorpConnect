import { NextResponse, NextRequest } from "next/server";
import { ResetSchema } from "@/lib/validation";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { getUserByEmail } from "@/data/user";
import { genPasswordResetToken } from "@/lib/tokens";
import { sendMail } from "@/lib/mailer";
import { passwordResetTokenBaseLink } from "@/constants";

export const POST = async (req: NextRequest) => {
    if (req.method !== "POST") {
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }

    try {
        const data = await req.json();

        const validated = ResetSchema.safeParse(data);

        if (!validated.success) {
            return NextResponse.json({ error: "Invalid Email" }, { status: 400 });
        }

        const { email } = validated.data;

        const user = await getUserByEmail(email);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const passwordResetToken = await genPasswordResetToken(email);

        if (!passwordResetToken) {
            return NextResponse.json({ error: "Unable to generate password reset token. Please try again later!" }, { status: 500 });
        }

        const verificationEmail = await sendMail({
            email: process.env.SENDER_EMAIL || "alerts@corpconnect.com",
            sendTo: passwordResetToken.email,
            subject: "Password Reset",
            html: `<p>To reset your password, please <a href="${passwordResetTokenBaseLink}${passwordResetToken.token}">click here</a>. <br></br> This link will expire in 1 hour.</p>`
        });

        if (!verificationEmail) {
            return NextResponse.json({ error: "Unable to send verification token. Please try again later!" }, { status: 500 });
        }

        return NextResponse.json({ message: "Password reset email sent successfully!" }, { status: 200 });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};