import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth"
import { LoginSchema } from "@/lib/validation";
import { mapTokenToSession } from "@/auth.session";
import { JWT_MAX_AGE_SECONDS } from "@/constants";

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
                if (!validated.success) return null;

                return { email: validated.data.email, password: validated.data.password } as Record<string, string>;
            }
        }),
    ],
    session: {
        maxAge: JWT_MAX_AGE_SECONDS,
    },
    callbacks: {
        async session({ session, token }) {
            return mapTokenToSession(session, token);
        },
    },
} satisfies NextAuthConfig
