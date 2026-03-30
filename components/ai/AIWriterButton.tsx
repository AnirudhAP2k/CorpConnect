"use client";

import { useState } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateEventDescription } from "@/lib/actions/generate";
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
                className="flex items-center gap-2 text-violet-600 border-violet-200 hover:bg-violet-50 hover:border-violet-400 transition-all"
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
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <X className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Generated Result Panel */}
            {result && (
                <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/50 overflow-hidden shadow-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-violet-200 bg-violet-100/60">
                        <div className="flex items-center gap-2 text-violet-700 font-medium text-sm">
                            <Sparkles className="w-4 h-4" />
                            AI-Generated Description
                        </div>
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="text-violet-400 hover:text-violet-700 transition-colors"
                            aria-label="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Generated Text Preview */}
                    <div className="px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {result.description}
                    </div>

                    {/* Source Documents Badge */}
                    {result.sourceDocs.length > 0 && (
                        <div className="px-4 pb-2 flex flex-wrap gap-1">
                            <span className="text-xs text-violet-500 font-medium mr-1">Sources used:</span>
                            {result.sourceDocs.map((doc, i) => (
                                <span
                                    key={i}
                                    className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full"
                                >
                                    {doc}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Suggestions Accordion */}
                    {result.suggestions.length > 0 && (
                        <div className="border-t border-violet-200">
                            <button
                                type="button"
                                onClick={() => setShowSuggestions(!showSuggestions)}
                                className="w-full flex items-center justify-between px-4 py-2 text-xs text-violet-600 hover:bg-violet-100/60 transition-colors"
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
                                        <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                                            <span className="text-violet-400 mt-0.5">•</span>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 px-4 py-3 border-t border-violet-200 bg-white">
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleAccept}
                            className="bg-violet-600 hover:bg-violet-700 text-white"
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
                            className="text-violet-600 hover:bg-violet-50"
                            id="ai-writer-retry-btn"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Regenerate"}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleDismiss}
                            className="text-gray-500 hover:bg-gray-100 ml-auto"
                        >
                            Discard
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
