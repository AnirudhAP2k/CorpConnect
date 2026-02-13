import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth"
import { LoginSchema } from "@/lib/validation";
import { getUserByEmail } from "@/data/user";
import bcrypt from "bcryptjs";

export default {
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID || "",
            clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
        }),
        GitHub({
            clientId: process.env.AUTH_GITHUB_ID || "",
            clientSecret: process.env.AUTH_GITHUB_SECRET || "",
        }),
        CredentialsProvider({
            async authorize(credentials: any) {
                const validated = LoginSchema.safeParse(credentials);

                if (!validated.success) {
                    return null;
                }

                const { email, password } = validated.data;

                const user = await getUserByEmail(email);

                if (!user || !user.password) {
                    return null;
                }

                const isValid = user.password && (await bcrypt.compare(password, user.password));

                if (!isValid) {
                    return null;
                }

                return user;
            }
        }),
    ],
} satisfies NextAuthConfig