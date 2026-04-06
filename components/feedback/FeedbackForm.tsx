"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedback } from "@/lib/actions/feedback";

interface FeedbackFormProps {
    eventId: string;
    eventTitle: string;
    /** Pre-fill values if the user already submitted */
    existing?: { rating: number; feedbackText: string | null };
    onSuccess?: () => void;
}

export function FeedbackForm({ eventId, eventTitle, existing, onSuccess }: FeedbackFormProps) {
    const [rating, setRating] = useState<number>(existing?.rating ?? 0);
    const [hovered, setHovered] = useState<number>(0);
    const [text, setText] = useState<string>(existing?.feedbackText ?? "");
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = () => {
        if (rating === 0) {
            setError("Please select a star rating before submitting.");
            return;
        }
        setError(null);
        startTransition(async () => {
            const result = await submitFeedback(eventId, rating, text || undefined);
            if (result.success) {
                setSubmitted(true);
                onSuccess?.();
            } else {
                setError(result.error);
            }
        });
    };

    if (submitted) {
        return (
            <div className="text-center py-8 space-y-2">
                <div className="text-4xl">🎉</div>
                <p className="font-semibold text-lg">Thank you for your feedback!</p>
                <p className="text-sm text-muted-foreground">
                    Our AI will analyse your response shortly and help organizers improve future events.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div>
                <p className="text-sm font-medium mb-1 text-muted-foreground">
                    How would you rate <span className="text-foreground font-semibold">{eventTitle}</span>?
                </p>
                {/* Star picker */}
                <div
                    id="feedback-star-rating"
                    className="flex gap-1 mt-2"
                    role="group"
                    aria-label="Star rating"
                    onMouseLeave={() => setHovered(0)}
                >
                    {[1, 2, 3, 4, 5].map(star => (
                        <button
                            key={star}
                            id={`feedback-star-${star}`}
                            type="button"
                            aria-label={`${star} star${star > 1 ? "s" : ""}`}
                            aria-pressed={rating === star}
                            className="transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHovered(star)}
                        >
                            <Star
                                className={`w-8 h-8 transition-colors ${star <= (hovered || rating)
                                        ? "fill-amber-400 text-amber-400"
                                        : "fill-muted text-muted-foreground"
                                    }`}
                            />
                        </button>
                    ))}
                    {rating > 0 && (
                        <span className="ml-3 text-sm font-medium text-amber-600 self-center">
                            {["", "Poor", "Fair", "Good", "Great", "Excellent!"][rating]}
                        </span>
                    )}
                </div>
            </div>

            {/* Optional comment */}
            <div>
                <label htmlFor="feedback-text" className="text-sm font-medium text-muted-foreground">
                    Additional comments <span className="text-xs">(optional)</span>
                </label>
                <Textarea
                    id="feedback-text"
                    placeholder="What did you enjoy? What could be improved?"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    maxLength={500}
                    rows={4}
                    className="mt-1.5 resize-none"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">
                    {text.length}/500
                </p>
            </div>

            {error && (
                <p id="feedback-error" role="alert" className="text-sm text-destructive font-medium">
                    {error}
                </p>
            )}

            <Button
                id="feedback-submit-btn"
                onClick={handleSubmit}
                disabled={isPending || rating === 0}
                className="w-full"
            >
                {isPending ? "Submitting…" : existing ? "Update Feedback" : "Submit Feedback"}
            </Button>
        </div>
    );
}
