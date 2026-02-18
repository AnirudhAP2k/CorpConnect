"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, X } from "lucide-react";

interface CancelParticipationButtonProps {
    eventId: string;
    eventTitle: string;
}

export default function CancelParticipationButton({
    eventId,
    eventTitle,
}: CancelParticipationButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleCancel = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/events/${eventId}/participate`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to cancel registration");
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
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Cancelling...
                            </>
                        ) : (
                            <>
                                <X className="w-4 h-4 mr-2" />
                                Cancel Registration
                            </>
                        )}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Registration?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel your registration for{" "}
                            <strong>{eventTitle}</strong>? You can re-register if spots are
                            still available.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep Registration</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Yes, Cancel
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
            )}
        </div>
    );
}
