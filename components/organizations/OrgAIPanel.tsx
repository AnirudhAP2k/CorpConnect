"use client";

import { useState } from "react";
import { Zap, Search, Lightbulb, Link as LinkIcon, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAIFeature } from "@/lib/actions/ai";

interface OrgAIPanelProps {
    orgId: string;
    hasCredentials: boolean;
    usageCount: number;
    usageLimit: number;
    tier: string;
}

export default function OrgAIPanel({ orgId, hasCredentials, usageCount, usageLimit, tier }: OrgAIPanelProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[] | null>(null);
    const [activeFeature, setActiveFeature] = useState<"search" | "recommendEvents" | "recommendOrgs" | null>(null);

    const handleAIFeature = async (feature: "search" | "recommendEvents" | "recommendOrgs") => {
        if (!hasCredentials) {
            toast.error("Please generate an API Key first in your settings.");
            return;
        }

        if (usageCount >= usageLimit) {
            toast.error("API usage limit reached.");
            return;
        }

        if (feature === "search" && !query.trim()) {
            toast.error("Please enter a search query.");
            return;
        }

        setIsLoading(true);
        setActiveFeature(feature);
        setResults(null);

        try {
            const apiCall = await useAIFeature({ orgId, feature, query });

            if (apiCall && !apiCall.success) {
                toast.error(apiCall.error || "Failed to contact AI service.");
            } else if (apiCall && apiCall.data) {
                setResults(apiCall.data);
                toast.success("AI request completed. 1 API call deducted.");
            }
        } catch (error: any) {
            toast.error(error.message || "An error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-solid border-2 border-primary/30 bg-primary/5">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 border-b border-primary/10">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold">AI-Powered Insights Active</CardTitle>
                        <CardDescription>
                            {hasCredentials
                                ? `Tier: ${tier} | Usage: ${usageCount}/${usageLimit} calls`
                                : "API Credentials required to access these features."}
                        </CardDescription>
                    </div>
                </div>
                <Badge variant={hasCredentials ? (usageCount >= usageLimit ? "destructive" : "default") : "secondary"} className={hasCredentials && usageCount < usageLimit ? "bg-primary text-primary-foreground" : ""}>
                    {hasCredentials ? (usageCount >= usageLimit ? "Limit Reached" : "Active") : "Inactive"}
                </Badge>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

                {/* Search Feature */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2"><Search className="h-4 w-4" /> Semantic Search</h4>
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Find events about AI, Web3, etc..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="bg-background"
                            disabled={isLoading || !hasCredentials || usageCount >= usageLimit}
                        />
                        <Button
                            onClick={() => handleAIFeature("search")}
                            disabled={isLoading || !hasCredentials || usageCount >= usageLimit}
                            variant="default"
                            size="sm"
                        >
                            {isLoading && activeFeature === "search" ? "Searching..." : "Search"}
                        </Button>
                    </div>
                </div>

                <div className="flex gap-4">
                    {/* Recommendation Buttons */}
                    <div className="space-y-3 flex-1">
                        <h4 className="text-sm font-medium flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Recommendations</h4>
                        <div className="flex flex-col gap-2">
                            <Button
                                onClick={() => handleAIFeature("recommendEvents")}
                                disabled={isLoading || !hasCredentials || usageCount >= usageLimit}
                                variant="outline"
                                className="w-full justify-start text-xs sm:text-sm"
                            >
                                Get Recommended Events
                            </Button>
                            <Button
                                onClick={() => handleAIFeature("recommendOrgs")}
                                disabled={isLoading || !hasCredentials || usageCount >= usageLimit}
                                variant="outline"
                                className="w-full justify-start text-xs sm:text-sm gap-2"
                            >
                                <LinkIcon className="h-3 w-3" /> Get Match-Making Organizations
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Results Display */}
                {results && results.length >= 0 && (
                    <div className="bg-background border rounded-lg p-3 max-h-48 overflow-y-auto">
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Results ({results.length})</h5>
                        {results.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No matches found by the AI.</p>
                        ) : (
                            <ul className="space-y-2">
                                {results.map((r: any, idx: number) => (
                                    <li key={idx} className="bg-muted px-3 py-2 rounded flex justify-between items-center text-sm">
                                        <span className="font-medium truncate mr-2">{r.title || r.name}</span>
                                        <Badge variant="secondary" className="text-[10px]">Score: {r.score?.toFixed(2)}</Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
