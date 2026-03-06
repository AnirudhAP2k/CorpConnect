"use server";

import { prisma } from "@/lib/db";

export const getTwoFactorTokenbyToken = async (token: string) => {
    try {
        const twoFactorToken = await prisma.twoFactorToken.findFirst({
            where: { token },
        });

        return twoFactorToken;
    } catch (error) {
        console.error(error);
        return null;
    }
};

export const getTwoFactorTokenbyEmail = async (email: string) => {
    try {
        const twoFactorToken = await prisma.twoFactorToken.findFirst({
            where: { email },
        });

        return twoFactorToken;
    } catch (error) {
        console.error(error);
        return null;
    }
};