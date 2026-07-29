/**
 * scripts/grant-admin.ts
 *
 * Grants or revokes the platform-admin flag (`User.isAppAdmin`) for an existing user.
 *
 * `isAppAdmin` defaults to false and nothing in the app can set it, so on a fresh
 * deployment there is no way to reach /admin — which means no way to approve the
 * KYB submissions that gate organization verification. This script is the
 * bootstrap: register through the normal sign-up flow, then promote that account.
 *
 * Usage:
 *   npx tsx scripts/grant-admin.ts you@company.com
 *   npx tsx scripts/grant-admin.ts you@company.com --revoke
 *
 * Inside Docker:
 *   docker compose exec server npx tsx scripts/grant-admin.ts you@company.com
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
    const revoke = args.includes("--revoke");

    if (!email) {
        console.error("Usage: npx tsx scripts/grant-admin.ts <email> [--revoke]");
        process.exit(1);
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, isAppAdmin: true },
    });

    if (!user) {
        console.error(`No user found with email "${email}".`);
        console.error("Register through the app first, then re-run this script.");
        process.exit(1);
    }

    const grant = !revoke;

    if (user.isAppAdmin === grant) {
        console.log(
            `${user.email} is already ${grant ? "an admin" : "a regular user"}. Nothing to do.`,
        );
        return;
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { isAppAdmin: grant },
    });

    console.log(
        grant
            ? `Granted platform admin to ${user.email}. Sign out and back in, then open /admin.`
            : `Revoked platform admin from ${user.email}.`,
    );

    if (grant) {
        const admins = await prisma.user.count({ where: { isAppAdmin: true } });
        console.log(`Platform admins now: ${admins}`);
    }
}

main()
    .catch((e) => {
        console.error("Failed to update admin flag:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
