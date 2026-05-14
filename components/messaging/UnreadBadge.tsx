"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function UnreadBadge() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let mounted = true;

        const fetchCount = async () => {
            try {
                const res = await fetch("/api/messaging/unread", { cache: "no-store" });
                if (res.ok && mounted) {
                    const data = await res.json();
                    setCount(data.count ?? 0);
                }
            } catch {
                // ignore network errors silently
            }
        };

        fetchCount();
        const interval = setInterval(fetchCount, 30_000); // poll every 30s
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    return (
        <Link
            href="/messaging"
            className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-nx-primary-container/60 text-nx-on-surface-variant hover:text-nx-primary transition-all duration-200"
            title="Messages"
        >
            <MessageSquare className="w-5 h-5" />
            {count > 0 && (
                <span
                    className={cn(
                        "absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-nx-primary text-white shadow-sm",
                        "animate-in fade-in zoom-in-75 duration-200"
                    )}
                >
                    {count > 99 ? "99+" : count}
                </span>
            )}
        </Link>
    );
}
