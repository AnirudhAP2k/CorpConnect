"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StartConversationButtonProps {
    targetOrgId: string;
    targetOrgName: string;
    className?: string;
}

export function StartConversationButton({
    targetOrgId,
    targetOrgName,
    className,
}: StartConversationButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleClick = async () => {
        setError(null);
        startTransition(async () => {
            try {
                const res = await fetch("/api/messaging/conversations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ targetOrgId }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    if (data.error === "NOT_CONNECTED") {
                        setError("You must be connected with this organization to message them.");
                    } else if (data.error === "INSUFFICIENT_ROLE") {
                        setError("Only admins can start new conversations.");
                    } else {
                        setError("Failed to open conversation. Please try again.");
                    }
                    return;
                }

                const { conversationId } = await res.json();
                router.push(`/messaging/${conversationId}`);
            } catch {
                setError("Network error. Please check your connection.");
            }
        });
    };

    return (
        <div className="flex flex-col gap-1">
            <button
                onClick={handleClick}
                disabled={isPending}
                className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                    "bg-nx-primary text-white hover:opacity-90 active:scale-95 shadow-nx-primary",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    className
                )}
            >
                {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <MessageSquare className="w-4 h-4" />
                )}
                {isPending ? "Opening…" : `Message ${targetOrgName}`}
            </button>
            {error && (
                <p className="text-xs text-red-500 px-1">{error}</p>
            )}
        </div>
    );
}
