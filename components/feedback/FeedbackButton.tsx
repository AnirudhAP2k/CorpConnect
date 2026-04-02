"use client";

import { useState } from "react";
import { MessageSquarePlus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";

interface FeedbackButtonProps {
    eventId: string;
    eventTitle: string;
    existing: { rating: number; feedbackText: string | null } | null;
}

/**
 * Client component: "Rate this event" FAB / button.
 * Opens a Dialog containing the FeedbackForm.
 * Shown only to registered, non-cancelled attendees (enforced server-side too).
 */
export function FeedbackButton({ eventId, eventTitle, existing }: FeedbackButtonProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                id="feedback-open-btn"
                variant={existing ? "outline" : "default"}
                size="sm"
                className="w-full gap-2"
                onClick={() => setOpen(true)}
            >
                {existing ? (
                    <>
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        Edit Your Feedback
                    </>
                ) : (
                    <>
                        <MessageSquarePlus className="w-4 h-4" />
                        Rate This Event
                    </>
                )}
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent id="feedback-sheet" side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
                    <SheetHeader className="mb-4">
                        <SheetTitle>
                            {existing ? "Update Your Feedback" : "Rate This Event"}
                        </SheetTitle>
                        <SheetDescription>
                            Your feedback helps organizers improve future events and is analysed by AI to surface actionable insights.
                        </SheetDescription>
                    </SheetHeader>

                    <FeedbackForm
                        eventId={eventId}
                        eventTitle={eventTitle}
                        existing={existing ?? undefined}
                        onSuccess={() => setTimeout(() => setOpen(false), 2000)}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}
