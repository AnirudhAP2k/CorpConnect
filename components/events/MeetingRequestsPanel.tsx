"use client";

import { useState, useTransition } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Building2, Calendar, Check, Clock, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import type { OrgMini, MeetingRequest } from "@/lib/types";

interface MeetingRequestsPanelProps {
    eventId: string;
    callerOrgId: string;
    incoming: MeetingRequest[];
    sent: MeetingRequest[];
    confirmed: MeetingRequest[];
}

export default function MeetingRequestsPanel({
    eventId,
    callerOrgId,
    incoming,
    sent,
    confirmed,
}: MeetingRequestsPanelProps) {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const refresh = () => startTransition(() => router.refresh());

    const act = async (requestId: string, action: "ACCEPT" | "DECLINE" | "CANCEL") => {
        setLoadingId(requestId);
        try {
            await axios.patch(`/api/events/${eventId}/meeting-requests/${requestId}`, { action });
            refresh();
        } catch (err: any) {
            console.error("Action failed:", err.response?.data?.error || err.message);
        } finally {
            setLoadingId(null);
        }
    };

    const totalPending = incoming.length;

    return (
        <div className="bg-nx-surface-container-lowest rounded-lg border border-nx-outline-variant/20 p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h2 className="font-bold text-lg">Meeting Requests</h2>
                    <p className="text-sm text-nx-on-surface-variant">Coordinate with orgs at this event</p>
                </div>
                {totalPending > 0 && (
                    <Badge className="ml-auto bg-nx-warning-container text-nx-on-warning-container">{totalPending} pending</Badge>
                )}
            </div>

            <Tabs defaultValue={incoming.length > 0 ? "incoming" : "sent"}>
                <TabsList className="w-full">
                    <TabsTrigger value="incoming" className="flex-1 gap-1.5">
                        Incoming
                        {incoming.length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-nx-warning text-nx-on-warning text-xs flex items-center justify-center">
                                {incoming.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="sent" className="flex-1">Sent</TabsTrigger>
                    <TabsTrigger value="confirmed" className="flex-1 gap-1.5">
                        <Check className="w-3.5 h-3.5" />Confirmed
                        {confirmed.length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-nx-success text-nx-on-success text-xs flex items-center justify-center">
                                {confirmed.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* ── Incoming ────────────────────────────────────────────── */}
                <TabsContent value="incoming" className="mt-4 space-y-3">
                    {incoming.length === 0 ? (
                        <EmptyState icon={<Users className="w-8 h-8" />} label="No incoming requests" />
                    ) : incoming.map((mr) => (
                        <MeetingCard key={mr.id} mr={mr} perspective="receiver" callerOrgId={callerOrgId}>
                            <Button size="sm" className="gap-1.5 bg-nx-success text-nx-on-success hover:bg-nx-success/90 h-8"
                                disabled={loadingId === mr.id} onClick={() => act(mr.id, "ACCEPT")}>
                                <Check className="w-3.5 h-3.5" />{loadingId === mr.id ? "…" : "Accept"}
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-nx-error border-nx-error/30 hover:bg-nx-error-container"
                                disabled={loadingId === mr.id} onClick={() => act(mr.id, "DECLINE")}>
                                <X className="w-3.5 h-3.5" />{loadingId === mr.id ? "…" : "Decline"}
                            </Button>
                        </MeetingCard>
                    ))}
                </TabsContent>

                {/* ── Sent ──────────────────────────────────────────────── */}
                <TabsContent value="sent" className="mt-4 space-y-3">
                    {sent.length === 0 ? (
                        <EmptyState icon={<Calendar className="w-8 h-8" />} label="No sent requests" />
                    ) : sent.map((mr) => (
                        <MeetingCard key={mr.id} mr={mr} perspective="sender" callerOrgId={callerOrgId}>
                            <div className="flex items-center gap-1.5 text-xs text-nx-warning">
                                <Clock className="w-3.5 h-3.5" />Awaiting response
                            </div>
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-nx-on-surface-variant hover:text-nx-error"
                                disabled={loadingId === mr.id} onClick={() => act(mr.id, "CANCEL")}>
                                <X className="w-3.5 h-3.5 mr-1" />{loadingId === mr.id ? "…" : "Cancel"}
                            </Button>
                        </MeetingCard>
                    ))}
                </TabsContent>

                {/* ── Confirmed ─────────────────────────────────────────── */}
                <TabsContent value="confirmed" className="mt-4 space-y-3">
                    {confirmed.length === 0 ? (
                        <EmptyState icon={<Check className="w-8 h-8" />} label="No confirmed meetings yet" />
                    ) : confirmed.map((mr) => (
                        <MeetingCard key={mr.id} mr={mr} perspective="both" callerOrgId={callerOrgId}>
                            <Badge className="bg-nx-success-container text-nx-on-success-container gap-1">
                                <Check className="w-3 h-3" />Confirmed
                            </Badge>
                        </MeetingCard>
                    ))}
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MeetingCard({
    mr, perspective, callerOrgId, children,
}: {
    mr: MeetingRequest;
    perspective: "sender" | "receiver" | "both";
    callerOrgId: string;
    children: React.ReactNode;
}) {
    const otherOrg = mr.senderOrg.id === callerOrgId ? mr.receiverOrg : mr.senderOrg;

    return (
        <div className="border border-nx-outline-variant/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
                {otherOrg.logo ? (
                    <Image src={otherOrg.logo} alt={otherOrg.name} width={40} height={40} className="rounded-md object-cover flex-shrink-0" />
                ) : (
                    <div className="w-10 h-10 rounded-md bg-nx-surface-container flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-nx-on-surface-variant" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <Link href={`/organizations/${otherOrg.id}`} className="font-semibold text-sm hover:text-primary">
                        {otherOrg.name}
                    </Link>
                    {otherOrg.industry && <p className="text-xs text-nx-on-surface-variant">{otherOrg.industry.label}</p>}

                    {mr.proposedTime && (
                        <div className="mt-1.5 text-xs bg-nx-success-container text-nx-on-success-container px-2 py-1 rounded inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(mr.proposedTime), "MMM d, yyyy · h:mm a")}
                        </div>
                    )}
                    {mr.agenda && (
                        <p className="text-xs text-nx-on-surface-variant mt-1.5 italic line-clamp-2">"{mr.agenda}"</p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-nx-outline-variant/15">
                {children}
                <span className="ml-auto text-xs text-nx-on-surface-variant/70">
                    {format(new Date(mr.createdAt), "MMM d")}
                </span>
            </div>
        </div>
    );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-nx-on-surface-variant">
            <div className="mb-2 opacity-30">{icon}</div>
            <p className="text-sm">{label}</p>
        </div>
    );
}
