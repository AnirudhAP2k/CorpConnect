"use client";

import { useState, useTransition } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Check, Clock, X, Handshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MeetingStatus } from "@/lib/types";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export type { MeetingStatus };

const formSchema = z.object({
    agenda: z.string().max(500, "Agenda must be less than 500 characters").optional(),
    proposedTime: z.date().optional().nullable(),
});

interface MeetingRequestButtonProps {
    eventId: string;
    targetOrgId: string;
    targetOrgName: string;
    initialStatus: MeetingStatus;
    initialRequestId?: string;
}

export default function MeetingRequestButton({
    eventId,
    targetOrgId,
    targetOrgName,
    initialStatus,
    initialRequestId,
}: MeetingRequestButtonProps) {
    const router = useRouter();
    const [status, setStatus] = useState<MeetingStatus>(initialStatus);
    const [requestId, setRequestId] = useState<string | undefined>(initialRequestId);
    const [loading, setLoading] = useState(false);
    const [, startTransition] = useTransition();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            agenda: "",
            proposedTime: null,
        },
    });

    const refresh = () => startTransition(() => router.refresh());

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        try {
            const { data } = await axios.post(`/api/events/${eventId}/meeting-requests`, {
                receiverOrgId: targetOrgId,
                agenda: values.agenda?.trim() || undefined,
                proposedTime: values.proposedTime ? values.proposedTime.toISOString() : undefined,
            });
            setStatus("PENDING_SENT");
            setRequestId(data.meetingRequest.id);
            form.reset();
            refresh();
        } catch (err: any) {
            console.error("Failed to send meeting request:", err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const performAction = async (action: "ACCEPT" | "DECLINE" | "CANCEL") => {
        if (!requestId) return;
        setLoading(true);
        try {
            await axios.patch(`/api/events/${eventId}/meeting-requests/${requestId}`, { action });
            setStatus(action === "ACCEPT" ? "ACCEPTED" : action === "DECLINE" ? "DECLINED" : "CANCELLED");
            refresh();
        } catch (err: any) {
            console.error("Action failed:", err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Accepted ─────────────────────────────────────────────────────────────
    if (status === "ACCEPTED") {
        return (
            <Badge className="bg-green-100 text-green-700 gap-1 px-3 py-1.5 cursor-default">
                <Handshake className="w-3.5 h-3.5" /> Meeting Confirmed
            </Badge>
        );
    }

    // ── Declined / Cancelled ─────────────────────────────────────────────────
    if (status === "DECLINED" || status === "CANCELLED") {
        return (
            <span className="text-xs text-gray-400 italic">
                {status === "DECLINED" ? "Request declined" : "Request cancelled"}
            </span>
        );
    }

    // ── Pending — Sent ───────────────────────────────────────────────────────
    if (status === "PENDING_SENT") {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs text-amber-600 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Pending response
                </span>
                <Button
                    size="sm" variant="ghost"
                    className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                    disabled={loading}
                    onClick={() => performAction("CANCEL")}
                >
                    <X className="w-3 h-3 mr-1" />Cancel
                </Button>
            </div>
        );
    }

    // ── Pending — Received ───────────────────────────────────────────────────
    if (status === "PENDING_RECEIVED") {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs text-primary-600 font-medium">Incoming request</span>
                <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 gap-1" disabled={loading} onClick={() => performAction("ACCEPT")}>
                    <Check className="w-3 h-3" />Accept
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50" disabled={loading} onClick={() => performAction("DECLINE")}>
                    <X className="w-3 h-3" />Decline
                </Button>
            </div>
        );
    }

    // ── NONE — Show send dialog ──────────────────────────────────────────────
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />Request Meeting
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-md bg-white">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Request a meeting with {targetOrgName}</AlertDialogTitle>
                            <AlertDialogDescription>
                                Send a meeting request for this event. Add an optional agenda and proposed time.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="agenda"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel>Agenda <span className="text-gray-400 font-normal">(optional)</span></FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                value={field.value || ""}
                                                onChange={(e) => field.onChange(e.target.value.slice(0, 500))}
                                                placeholder="What would you like to discuss?"
                                                rows={3}
                                                className="resize-none"
                                            />
                                        </FormControl>
                                        <p className="text-xs text-gray-400 text-right">{(field.value || "").length}/500</p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="proposedTime"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5 w-full">
                                        <FormLabel>Proposed Time <span className="text-gray-400 font-normal">(optional)</span></FormLabel>
                                        <FormControl>
                                            <div className="flex items-center h-[54px] w-full overflow-hidden rounded-full bg-gray-50 px-4 py-2 border border-gray-200">
                                                <Calendar className="w-5 h-5 text-gray-500" />
                                                <p className="ml-3 whitespace-nowrap text-gray-600 mr-2 border-r pr-3 border-gray-200">Time</p>
                                                <DatePicker
                                                    selected={field.value}
                                                    onChange={(date: Date | null) => field.onChange(date)}
                                                    showTimeSelect
                                                    timeInputLabel='Time'
                                                    dateFormat="MM/dd/yyyy h:mm aa"
                                                    wrapperClassName='datePicker'
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel type="button" onClick={() => form.reset()}>Cancel</AlertDialogCancel>
                            <Button type="submit" disabled={loading} className="gap-2">
                                <Calendar className="w-4 h-4" />
                                {loading ? "Sending…" : "Send Request"}
                            </Button>
                        </AlertDialogFooter>
                    </form>
                </Form>
            </AlertDialogContent>
        </AlertDialog>
    );
}
