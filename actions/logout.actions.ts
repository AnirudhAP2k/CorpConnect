/**
 * Logout action
 * Sign out (triggers event to revoke token in DB)
 */
"use server";

import { signOut } from "@/auth";

export const logout = async () => {
    await signOut({ redirectTo: "/" });
}
