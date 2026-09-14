"use client";

import { useState } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateEventDescription } from "@/actions/ai.actions";
import { AIGeneratedContent } from "@/lib/ai-service";

interface AIWriterButtonProps {
    orgId: string;
    eventId?: string;
    currentDraft: string;
    onAccept: (description: string) => void;
}

export function AIWriterButton({
    orgId,
    eventId,
    currentDraft,
    onAccept,
}: AIWriterButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<AIGeneratedContent | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleGenerate = async () => {
        if (!currentDraft || currentDraft.trim().length < 10) {
            setError("Please write at least a short draft (10+ characters) before asking AI to expand it.");
            return;
        }
        setIsLoading(true);
        setResult(null);
        setError(null);

        const response = await generateEventDescription(orgId, currentDraft, eventId);

        setIsLoading(false);
        if (response.success) {
            setResult(response.data);
        } else {
            setError(response.error);
        }
    };

    const handleAccept = () => {
        if (result) {
            onAccept(result.description);
            setResult(null);
        }
    };

    const handleDismiss = () => {
        setResult(null);
        setError(null);
    };

    return (
        <div className="w-full">
            {/* Trigger Button */}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-xl border-nx-outline-variant text-nx-primary transition-all hover:border-nx-primary hover:bg-nx-surface-container"
                id="ai-writer-btn"
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Sparkles className="w-4 h-4" />
                )}
                {isLoading ? "Generating…" : "AI Writer"}
            </Button>

            {/* Error State */}
            {error && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-nx-error/25 bg-nx-error-container p-3 text-sm text-nx-on-error-container">
                    <X className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Generated Result Panel */}
            {result && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-nx-outline-variant/30 bg-nx-surface-container-lowest shadow-nx-card">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-nx-outline-variant/30 bg-nx-primary-container px-4 py-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-nx-on-primary-container">
                            <Sparkles className="w-4 h-4" />
                            AI-Generated Description
                        </div>
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="text-nx-on-primary-container/70 transition-colors hover:text-nx-on-primary-container"
                            aria-label="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Generated Text Preview */}
                    <div className="whitespace-pre-wrap px-4 py-3 font-body text-sm leading-relaxed text-nx-on-surface">
                        {result.description}
                    </div>

                    {/* Source Documents Badge */}
                    {result.sourceDocs.length > 0 && (
                        <div className="px-4 pb-2 flex flex-wrap gap-1">
                            <span className="mr-1 text-xs font-medium text-nx-on-surface-variant">Sources used:</span>
                            {result.sourceDocs.map((doc, i) => (
                                <span
                                    key={i}
                                    className="rounded-lg bg-nx-secondary-container px-2 py-0.5 text-xs text-nx-on-secondary-container"
                                >
                                    {doc}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Suggestions Accordion */}
                    {result.suggestions.length > 0 && (
                        <div className="border-t border-nx-outline-variant/30">
                            <button
                                type="button"
                                onClick={() => setShowSuggestions(!showSuggestions)}
                                className="flex w-full items-center justify-between px-4 py-2 text-xs text-nx-primary transition-colors hover:bg-nx-surface-container"
                            >
                                <span className="font-medium">
                                    💡 {result.suggestions.length} improvement suggestions
                                </span>
                                {showSuggestions ? (
                                    <ChevronUp className="w-3 h-3" />
                                ) : (
                                    <ChevronDown className="w-3 h-3" />
                                )}
                            </button>
                            {showSuggestions && (
                                <ul className="px-4 pb-3 space-y-1">
                                    {result.suggestions.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs text-nx-on-surface-variant">
                                            <span className="mt-0.5 text-nx-primary">•</span>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-nx-outline-variant/30 bg-nx-surface-container-low px-4 py-3">
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleAccept}
                            className="rounded-xl"
                            id="ai-writer-accept-btn"
                        >
                            Use This Description
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="rounded-xl text-nx-primary hover:bg-nx-surface-container-high"
                            id="ai-writer-retry-btn"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Regenerate"}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleDismiss}
                            className="ml-auto rounded-xl text-nx-on-surface-variant hover:bg-nx-surface-container-high"
                        >
                            Discard
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
