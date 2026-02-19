"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, UserCheck, LogIn } from "lucide-react";
import Link from "next/link";

interface JoinEventButtonProps {
    eventId: string;
    isFull: boolean;
    isLoggedIn: boolean;
    activeOrganizationId?: string | null;
}

export default function JoinEventButton({
    eventId,
    isFull,
    isLoggedIn,
    activeOrganizationId,
}: JoinEventButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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

            router.refresh();
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
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
                        <UserCheck className="w-4 h-4 mr-2" />
                        Join Event
                    </>
                )}
            </Button>
            {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
            )}
        </div>
    );
}
