import { NextResponse, NextRequest } from "next/server";
import { LoginSchema } from "@/lib/validation";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { getUserByEmail } from "@/data/user";
import { genTwoFactorToken, genVerificationToken } from "@/lib/tokens";
import bcrypt from "bcryptjs";
import { sendMail } from "@/lib/mailer";
import { tokenVerificationBaseLink } from "@/constants";
import { getTwoFactorTokenbyEmail } from "@/data/two-factor-token";
import { prisma } from "@/lib/db";
import { getTwoFactorConfirmationbyUserId } from "@/data/two-factor-confirmation";

export const POST = async (req: NextRequest) => {
    if (req.method !== "POST") {
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }

    try {
        const data = await req.json();

        const validated = LoginSchema.safeParse(data);

        if (!validated.success) {
            return NextResponse.json({ error: "Invalid Credentials" }, { status: 400 });
        }

        const { email, password, code } = validated.data;

        const user = await getUserByEmail(email);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const isValid = user.password && (await bcrypt.compare(password, user.password));

        if (!isValid) {
            return NextResponse.json({ error: "Invalid Password" }, { status: 400 });
        }

        if (!user.emailVerified) {
            const verificationToken = await genVerificationToken(email);

            if (!verificationToken) {
                return NextResponse.json({ error: "Unable to generate verification token. Please try again later!" }, { status: 500 });
            }

            const verificationEmail = await sendMail({
                email: process.env.SENDER_EMAIL || "alerts@corpconnect.com",
                sendTo: verificationToken.email,
                subject: "Verify your email address",
                html: `<p>To verify your email, please <a href="${tokenVerificationBaseLink}${verificationToken.token}">click here</a>. <br></br> This link will expire in 1 hour.</p>`
            });

            if (!verificationEmail?.messageId) {
                return NextResponse.json({ error: "Unable to send verification token. Please try again later!" }, { status: 500 });
            }

            return NextResponse.json({ message: "Email not verified. Verification email sent" }, { status: 202 });
        }

        if (user.isTwoFactorEnabled && user.email) {

            if (code) {
                const twoFactorToken = await getTwoFactorTokenbyEmail(user.email);

                if (!twoFactorToken || twoFactorToken.token !== code) {
                    return NextResponse.json({ error: "Invalid code" }, { status: 404 });
                }

                const hasExpired = new Date(twoFactorToken.expiresAt) < new Date();

                if (hasExpired) {
                    return NextResponse.json({ error: "Code has expired. Please try again" }, { status: 400 });
                }

                await prisma.twoFactorToken.delete({
                    where: { id: twoFactorToken.id },
                });

                const existingConfirmation = await getTwoFactorConfirmationbyUserId(user.id);

                if (existingConfirmation) {
                    await prisma.twoFactorConfirmation.delete({
                        where: { id: existingConfirmation.id },
                    });
                }

                await prisma.twoFactorConfirmation.create({
                    data: { userId: user.id }
                });

            } else {
                const twoFactorToken = await genTwoFactorToken(user.email);

                if (!twoFactorToken) {
                    return NextResponse.json({ error: "Unable to generate 2FA token. Please try again later!" }, { status: 500 });
                }

                const sendTwoFactorEmail = await sendMail({
                    email: process.env.SENDER_EMAIL || "alerts@corpconnect.com",
                    sendTo: twoFactorToken.email,
                    subject: "Verify your login",
                    html: `<p>Here is your 2FA code, please verify: ${twoFactorToken.token} <br></br> This code will expire in 15 minutes.</p>`
                });

                if (!sendTwoFactorEmail?.messageId) {
                    return NextResponse.json({ error: "Unable to send 2FA token. Please try again later!" }, { status: 500 });
                }

                return NextResponse.json({ message: "2FA Token email sent. Please verify!", showTwoFactor: true }, { status: 202 });
            }
        }

        try {
            await signIn("credentials", {
                email,
                password,
                code,
                redirect: false,
            });
        } catch (error: any) {
            console.error(error.message);
            if (error instanceof AuthError) {
                switch (error.type) {
                    case "CredentialsSignin": {
                        return NextResponse.json({ error: "Invalid Credentials" }, { status: 400 });
                    }
                    case "AccessDenied": {
                        return NextResponse.json({ error: "Access Denied" }, { status: 401 });
                    }
                    case "OAuthSignInError": {
                        return NextResponse.json({ error: "OAuth SignIn Failed" }, { status: 400 });
                    }
                    default: {
                        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
                    }
                }
            }
        }

        return NextResponse.json({ message: "Login Successful" }, { status: 200 });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
