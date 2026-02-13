"use client";

import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { DayPicker } from "react-day-picker";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import "react-day-picker/dist/style.css";

export default function DateRangeFilter({ clearRange }: { clearRange: boolean }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [range, setRange] = useState<DateRange | undefined>({
        from: searchParams.get("fromDate")
            ? new Date(searchParams.get("fromDate")!)
            : undefined,
        to: searchParams.get("toDate")
            ? new Date(searchParams.get("toDate")!)
            : undefined,
    });

    const applyFilter = () => {
        const params = new URLSearchParams(searchParams.toString());

        params.delete("fromDate");
        params.delete("toDate");

        if (range?.from) {
            params.set("fromDate", format(range.from, "yyyy-MM-dd"));
        }

        if (range?.to) {
            params.set("toDate", format(range.to, "yyyy-MM-dd"));
        }

        router.push(`/events?${params.toString()}`);
    };

    const clearFilter = () => {
        setRange(undefined);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("fromDate");
        params.delete("toDate");
        router.push(`/events?${params.toString()}`);
    };

    useEffect(() => {
        if (clearRange) {
            clearFilter();
        }
    }, [clearRange]);

    return (
        <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
                Date Range
            </label>
            <div className="flex flex-col gap-3">
                <div className="rdp-container" style={{ fontSize: '0.875rem' }}>
                    <DayPicker
                        mode="range"
                        selected={range}
                        onSelect={setRange}
                        className="!m-0"
                        classNames={{
                            months: "flex flex-col",
                            caption: "flex justify-center pt-1 relative items-center",
                            caption_label: "text-sm font-normal",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                            table: "w-full border-collapse",
                            head_row: "flex",
                            head_cell: "text-gray-500 rounded-md w-8 font-normal text-[0.8rem]",
                            row: "flex w-full mt-2",
                            cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                            day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-md",
                            day_selected: "bg-primary-600 text-white hover:bg-primary-700 hover:text-white focus:bg-primary-600 focus:text-white",
                            day_today: "bg-gray-100 text-gray-900",
                            day_outside: "text-gray-400 opacity-50",
                            day_disabled: "text-gray-400 opacity-50",
                            day_range_middle: "aria-selected:bg-primary-100 aria-selected:text-gray-900",
                            day_hidden: "invisible",
                        }}
                    />
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={applyFilter}
                        className="flex-1"
                        size="sm"
                        disabled={!range?.from && !range?.to}
                    >
                        Apply
                    </Button>
                    {(range?.from || range?.to) && (
                        <Button
                            onClick={clearFilter}
                            variant="outline"
                            className="flex-1"
                            size="sm"
                        >
                            Clear
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
