"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, UserCheck, LogIn, CreditCard } from "lucide-react";
import Link from "next/link";
import { ProviderPicker } from "@/components/billing/ProviderPicker";

interface JoinEventButtonProps {
    eventId: string;
    eventTitle?: string;
    price?: string;
    currency?: string;
    isFree?: boolean;
    isFull: boolean;
    isLoggedIn: boolean;
    activeOrganizationId?: string | null;
}

export default function JoinEventButton({
    eventId,
    eventTitle,
    price,
    currency,
    isFree = false,
    isFull,
    isLoggedIn,
    activeOrganizationId,
}: JoinEventButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPicker, setShowPicker] = useState(false);
    const router = useRouter();

    if (!isLoggedIn) {
        return (
            <Link href={`/login?callbackUrl=/events/${eventId}`}>
                <Button className="w-full" size="lg">
                    <LogIn className="w-4 h-4 mr-2" />
                    Login to Join
                </Button>
            </Link>
        );
    }

    if (isFull) {
        return (
            <div className="space-y-2">
                <Button className="w-full" size="lg" disabled variant="secondary">
                    Event Full
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                    This event has reached maximum capacity
                </p>
            </div>
        );
    }

    const handleJoin = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/events/${eventId}/participate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organizationId: activeOrganizationId || null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to join event");
                return;
            }

            if (data.needsCheckout) {
                setShowPicker(true);
                return;
            }

            if (data.redirectUrl) {
                router.push(data.redirectUrl);
                return;
            }

            router.refresh();
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="space-y-2">
                <Button
                    className="w-full"
                    size="lg"
                    onClick={handleJoin}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Joining...
                        </>
                    ) : (
                        <>
                            {!isFree ? (
                                <CreditCard className="w-4 h-4 mr-2" />
                            ) : (
                                <UserCheck className="w-4 h-4 mr-2" />
                            )}
                            {isFree ? "Join Event" : "Register & Pay"}
                        </>
                    )}
                </Button>
                {error && (
                    <p className="text-sm text-destructive text-center">{error}</p>
                )}
            </div>
            {showPicker && (
                <ProviderPicker
                    eventId={eventId}
                    eventTitle={eventTitle || "Event"}
                    price={price || "0"}
                    currency={currency || "INR"}
                    onClose={() => setShowPicker(false)}
                    onSuccess={() => router.refresh()}
                />
            )}
        </>
    );
}
