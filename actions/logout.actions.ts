/**
 * Logout action
 * Revoke refresh token
 * Delete refresh token cookie
 * Sign out
 */
"use server";

import { signOut } from "@/auth";
import { revokeToken } from "@/lib/tokens";
import { cookies } from "next/headers";

export const logout = async () => {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (refreshToken) {
        await revokeToken(refreshToken);
    }

    cookieStore.delete("refreshToken");

    await signOut({ redirectTo: "/" });
}
