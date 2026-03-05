"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { Building2, Check, X, Clock, Handshake, Link2Off } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";

interface OrgMini {
    id: string;
    name: string;
    logo: string | null;
    industry: { label: string };
}

interface Connection {
    id: string;
    sourceOrg: OrgMini;
    targetOrg: OrgMini;
    status: string;
    message: string | null;
    createdAt: string;
    initiatedBy: { id: string; name: string | null };
}

interface OrgConnectionsPanelProps {
    orgId: string;
    /** all connections passed from server: accepted, pending-sent, pending-received */
    accepted: Connection[];
    pendingSent: Connection[];
    pendingReceived: Connection[];
}

// Small org mini-card inside the panel
function OrgRow({ org, meta, actions }: { org: OrgMini; meta?: React.ReactNode; actions?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 py-3 border-b last:border-0">
            <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border">
                {org.logo ? (
                    <Image src={org.logo} alt={org.name} fill className="object-cover" sizes="40px" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-400" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <Link href={`/organizations/${org.id}`} className="font-medium text-sm hover:text-primary transition-colors">
                    {org.name}
                </Link>
                <p className="text-xs text-gray-500">{org.industry.label}</p>
                {meta && <div className="mt-0.5">{meta}</div>}
            </div>
            {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
    );
}

export default function OrgConnectionsPanel({
    orgId,
    accepted: initialAccepted,
    pendingSent: initialSent,
    pendingReceived: initialReceived,
}: OrgConnectionsPanelProps) {
    const router = useRouter();
    const [accepted, setAccepted] = useState(initialAccepted);
    const [sent, setSent] = useState(initialSent);
    const [received, setReceived] = useState(initialReceived);
    const [, startTransition] = useTransition();

    const action = async (connectionId: string, act: "ACCEPT" | "DECLINE" | "WITHDRAW", targetOrgId: string) => {
        try {
            await axios.patch(`/api/organizations/${targetOrgId}/connections/${connectionId}`, { action: act });
            startTransition(() => router.refresh());
        } catch (e) {
            console.error(e);
        }
    };

    const removeAccepted = async (connectionId: string, targetOrgId: string) => {
        try {
            await axios.delete(`/api/organizations/${targetOrgId}/connections/${connectionId}`);
            setAccepted((prev) => prev.filter((c) => c.id !== connectionId));
        } catch (e) {
            console.error(e);
        }
    };

    const totalPending = sent.length + received.length;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Handshake className="w-5 h-5 text-gray-500" />
                    Connections
                    {totalPending > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 ml-1">{totalPending} pending</Badge>
                    )}
                </CardTitle>
                <CardDescription>Organizations connected to {accepted.length > 0 ? `${accepted.length} partners` : "no partners yet"}</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue={received.length > 0 ? "received" : "accepted"}>
                    <TabsList className="mb-4 w-full">
                        <TabsTrigger value="accepted" className="flex-1">
                            Connected ({accepted.length})
                        </TabsTrigger>
                        <TabsTrigger value="received" className="flex-1">
                            Incoming {received.length > 0 && <span className="ml-1 w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">{received.length}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="sent" className="flex-1">
                            Sent ({sent.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Connected */}
                    <TabsContent value="accepted">
                        {accepted.length === 0 ? (
                            <div className="text-center py-8">
                                <Handshake className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">No connections yet.</p>
                                <Link href="/organizations/discover">
                                    <Button variant="outline" size="sm" className="mt-3">Discover Organizations</Button>
                                </Link>
                            </div>
                        ) : (
                            accepted.map((c) => {
                                const partner = c.sourceOrg.id === orgId ? c.targetOrg : c.sourceOrg;
                                return (
                                    <OrgRow key={c.id} org={partner}
                                        meta={<span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" />Connected</span>}
                                        actions={
                                            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 h-7 px-2"
                                                onClick={() => removeAccepted(c.id, partner.id)}
                                                title="Remove connection">
                                                <Link2Off className="w-4 h-4" />
                                            </Button>
                                        }
                                    />
                                );
                            })
                        )}
                    </TabsContent>

                    {/* Incoming */}
                    <TabsContent value="received">
                        {received.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-8">No incoming requests</p>
                        ) : (
                            received.map((c) => (
                                <OrgRow key={c.id} org={c.sourceOrg}
                                    meta={c.message ? <span className="text-xs text-gray-500 italic">"{c.message}"</span> : undefined}
                                    actions={
                                        <div className="flex gap-1.5">
                                            <Button size="sm" className="h-7 px-2 bg-green-600 hover:bg-green-700 gap-1"
                                                onClick={() => action(c.id, "ACCEPT", orgId)}>
                                                <Check className="w-3.5 h-3.5" />Accept
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-7 px-2 text-red-500 border-red-200 gap-1"
                                                onClick={() => action(c.id, "DECLINE", orgId)}>
                                                <X className="w-3.5 h-3.5" />Decline
                                            </Button>
                                        </div>
                                    }
                                />
                            ))
                        )}
                    </TabsContent>

                    {/* Sent */}
                    <TabsContent value="sent">
                        {sent.length === 0 ? (
                            <p className="text-center text-sm text-gray-400 py-8">No pending sent requests</p>
                        ) : (
                            sent.map((c) => (
                                <OrgRow key={c.id} org={c.targetOrg}
                                    meta={<span className="text-xs text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3" />Pending</span>}
                                    actions={
                                        <Button size="sm" variant="outline" className="h-7 px-2 text-gray-500 text-xs"
                                            onClick={() => action(c.id, "WITHDRAW", c.targetOrg.id)}>
                                            Withdraw
                                        </Button>
                                    }
                                />
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
