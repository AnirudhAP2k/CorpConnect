"use server";

import { prisma } from "@/lib/db";
import { User } from "next-auth";

export const getUserById = async (id: string) => {
    try {
        const user = await prisma.user.findUnique({ where: { id } });

        return user;
    } catch (error) {
        return null;
    }
};

export const getUserByEmail = async (email: string) => {
    try {
        const user = await prisma.user.findUnique({ where: { email } });

        return user;
    } catch (error) {
        return null;
    }
};

export const getUserTierWithActiveOrg = async (user: User) => {
    try {
        if (!user.activeOrganizationId) {
            return "FREE";
        }

        const apiCred = await prisma.apiCredential.findUnique({
            where: { organizationId: user.activeOrganizationId }
        });

        return apiCred?.tier || "FREE";
    } catch (error) {
        return "FREE";
    }
}
