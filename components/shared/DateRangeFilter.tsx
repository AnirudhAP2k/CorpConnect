"use client";

import { useState } from "react";
import { DateRange } from "react-day-picker";
import { DayPicker } from "react-day-picker";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import "react-day-picker/dist/style.css";

function toRange(
	from: string | null,
	to: string | null,
): DateRange | undefined {
	if (!from && !to) return undefined;
	return {
		from: from ? new Date(from) : undefined,
		to: to ? new Date(to) : undefined,
	};
}

export default function DateRangeFilter() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const fromParam = searchParams.get("fromDate");
	const toParam = searchParams.get("toDate");

	const [range, setRange] = useState<DateRange | undefined>(() =>
		toRange(fromParam, toParam),
	);

	// The URL is the source of truth for the applied filter, but the picker needs
	// local state to hold a selection before it is applied. Re-sync on render when
	// the URL's date params change so the two cannot drift apart.
	const urlKey = `${fromParam ?? ""}|${toParam ?? ""}`;
	const [syncedKey, setSyncedKey] = useState(urlKey);
	if (syncedKey !== urlKey) {
		setSyncedKey(urlKey);
		setRange(toRange(fromParam, toParam));
	}

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

	return (
		<div className="mb-6">
			<label className="mb-2 block font-label text-sm font-medium text-nx-on-surface">
				Date Range
			</label>
			<div className="flex flex-col gap-3">
				<div className="rdp-container overflow-x-auto font-body text-sm text-nx-on-surface">
					<DayPicker
						mode="range"
						selected={range}
						onSelect={setRange}
						className="!m-0"
						classNames={{
							months: "flex flex-col",
							caption: "flex justify-center pt-1 relative items-center",
							caption_label: "text-sm font-medium text-nx-on-surface",
							nav: "space-x-1 flex items-center",
							nav_button:
								"h-7 w-7 rounded-lg bg-transparent p-0 text-nx-on-surface-variant opacity-70 hover:bg-nx-surface-container hover:opacity-100",
							table: "w-full border-collapse",
							head_row: "flex",
							head_cell:
								"w-8 rounded-lg font-label text-[0.8rem] font-normal text-nx-on-surface-variant",
							row: "flex w-full mt-2",
							cell: "relative p-0 text-center text-sm [&:has([aria-selected])]:bg-nx-primary-container/35 first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg focus-within:relative focus-within:z-20",
							day: "h-8 w-8 rounded-lg p-0 font-normal hover:bg-nx-surface-container aria-selected:opacity-100",
							day_selected:
								"bg-nx-primary text-nx-on-primary hover:bg-nx-primary/90 hover:text-nx-on-primary focus:bg-nx-primary focus:text-nx-on-primary",
							day_today: "bg-nx-surface-container-high text-nx-on-surface",
							day_outside: "text-nx-on-surface-variant opacity-45",
							day_disabled: "text-nx-on-surface-variant opacity-45",
							day_range_middle:
								"aria-selected:bg-nx-primary-container/35 aria-selected:text-nx-on-surface",
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
