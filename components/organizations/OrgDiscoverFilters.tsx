"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal, X } from "lucide-react";

interface FilterOption {
    id: string;
    label: string;
}

interface OrgDiscoverFiltersProps {
    industries: FilterOption[];
    tags: FilterOption[];
}

const SIZES = [
    { id: "STARTUP", label: "Startup" },
    { id: "SME", label: "SME" },
    { id: "ENTERPRISE", label: "Enterprise" },
];

/**
 * Interactive filter panel for the Org Discovery page.
 * Client component — drives URL searchParams to trigger SSR re-render.
 * Uses router.push() so filters are shareable/bookmarkable URLs.
 */
export default function OrgDiscoverFilters({ industries, tags }: OrgDiscoverFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const current = {
        q: searchParams.get("q") ?? "",
        industry: searchParams.get("industry") ?? "",
        size: searchParams.get("size") ?? "",
        location: searchParams.get("location") ?? "",
        tags: searchParams.get("tags") ?? "",
    };

    const hasFilters = Object.values(current).some(Boolean);

    const pushFilter = useCallback(
        (key: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
            params.delete("page"); // reset pagination on filter change
            startTransition(() => router.push(`${pathname}?${params.toString()}`));
        },
        [router, pathname, searchParams]
    );

    const clearAll = () => {
        startTransition(() => router.push(pathname));
    };

    return (
        <div className={`transition-opacity ${isPending ? "opacity-50" : ""}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                    <h3 className="font-semibold text-gray-800">Filters</h3>
                </div>
                {hasFilters && (
                    <button
                        onClick={clearAll}
                        className="text-xs text-primary hover:underline flex items-center gap-0.5"
                    >
                        <X className="w-3 h-3" /> Clear all
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="mb-5">
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Search</Label>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value;
                        pushFilter("q", q);
                    }}
                    className="flex gap-2"
                >
                    <Input
                        name="q"
                        defaultValue={current.q}
                        placeholder="Search organizations…"
                        className="text-sm"
                    />
                    <Button type="submit" size="sm" variant="outline">Go</Button>
                </form>
            </div>

            {/* Location */}
            <div className="mb-5">
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Location</Label>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const loc = (e.currentTarget.elements.namedItem("location") as HTMLInputElement).value;
                        pushFilter("location", loc);
                    }}
                    className="flex gap-2"
                >
                    <Input
                        name="location"
                        defaultValue={current.location}
                        placeholder="City or region…"
                        className="text-sm"
                    />
                    <Button type="submit" size="sm" variant="outline">Go</Button>
                </form>
            </div>

            {/* Industry */}
            <div className="mb-5">
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Industry</Label>
                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => pushFilter("industry", "")}
                        className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${!current.industry ? "bg-primary/10 text-primary font-medium" : "hover:bg-gray-100 text-gray-700"
                            }`}
                    >
                        All Industries
                    </button>
                    {industries.map((ind) => (
                        <button
                            key={ind.id}
                            onClick={() => pushFilter("industry", current.industry === ind.id ? "" : ind.id)}
                            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${current.industry === ind.id
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-gray-100 text-gray-700"
                                }`}
                        >
                            {ind.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Size */}
            <div className="mb-5">
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Organization Size</Label>
                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => pushFilter("size", "")}
                        className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${!current.size ? "bg-primary/10 text-primary font-medium" : "hover:bg-gray-100 text-gray-700"
                            }`}
                    >
                        All Sizes
                    </button>
                    {SIZES.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => pushFilter("size", current.size === s.id ? "" : s.id)}
                            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${current.size === s.id
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-gray-100 text-gray-700"
                                }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
                <div className="mb-5">
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Tags</Label>
                    <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => {
                            const activeTags = current.tags ? current.tags.split(",") : [];
                            const isActive = activeTags.includes(tag.id);
                            const nextTags = isActive
                                ? activeTags.filter((t) => t !== tag.id)
                                : [...activeTags, tag.id];
                            return (
                                <button
                                    key={tag.id}
                                    onClick={() => pushFilter("tags", nextTags.join(","))}
                                    className={`px-2.5 py-1 rounded-full text-xs transition-colors border ${isActive
                                            ? "bg-primary text-white border-primary"
                                            : "bg-white text-gray-600 border-gray-300 hover:border-primary"
                                        }`}
                                >
                                    {tag.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
