import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RegisterSchema } from "@/lib/validation";
import { getUserByEmail } from "@/data/user";
import { genVerificationToken } from "@/lib/tokens";
import { sendMail } from "@/lib/mailer";
import { tokenVerificationBaseLink } from "@/constants";

export const POST = async (req: NextRequest) => {
    if (req.method !== "POST") {
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }

    try {
        const data = await req.json();

        const validated = RegisterSchema.safeParse(data);

        if (!validated.success) {
            return NextResponse.json({ error: "Incorrect Credentials" }, { status: 400 });
        }

        const { name, email, password } = validated.data;

        const existingUser = await getUserByEmail(email);

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        const verificationToken = await genVerificationToken(email);

        const verificationEmail = await sendMail({
            email: process.env.SENDER_EMAIL || "alerts@corpconnect.com",
            sendTo: verificationToken.email,
            subject: "Verify your email address",
            html: `<p>To verify your email, please <a href="${tokenVerificationBaseLink}${verificationToken.token}">click here</a>. <br></br> This link will expire in 1 hour.</p>`
        });

        if (!verificationEmail) {
            return NextResponse.json({ error: "Unable to send verification token. Please try again later!" }, { status: 300 });
        }

        const salt = await bcryptjs.genSalt();
        const hashedPassword = await bcryptjs.hash(password, salt);

        const newUser = await prisma.user.create({
            data: { name, email, password: hashedPassword },
        });

        return NextResponse.json({ message: "Verification email sent", user: newUser }, { status: 201 });
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
