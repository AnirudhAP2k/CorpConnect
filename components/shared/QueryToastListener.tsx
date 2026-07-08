"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { FLASH_REGISTRY } from "@/lib/flash-toast";

/**
 * Reads a `?flash=<code>` query parameter, looks up the code in
 * FLASH_REGISTRY, fires the matching toast, and cleans the URL.
 *
 * Unknown codes are silently ignored (no user-tamperable messages).
 */
function ToastHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const flashCode = searchParams.get("flash");
        if (!flashCode) return;

        const entry = FLASH_REGISTRY[flashCode];
        if (entry) {
            toast[entry.type](entry.message);
        }

        // Clean the flash param from the URL
        const params = new URLSearchParams(searchParams.toString());
        params.delete("flash");
        const query = params.toString() ? `?${params.toString()}` : "";
        router.replace(`${pathname}${query}`);
    }, [searchParams, router, pathname]);

    return null;
}

export function QueryToastListener() {
    return (
        <Suspense fallback={null}>
            <ToastHandler />
        </Suspense>
    );
}
