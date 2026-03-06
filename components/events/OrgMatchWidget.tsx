import Image from "next/image";
import Link from "next/link";
import { Building2, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MeetingRequestButton from "@/components/events/MeetingRequestButton";
import type { MatchedOrg, MeetingStatus } from "@/lib/types";

interface OrgMatchWidgetProps {
    eventId: string;
    callerOrgId: string;
    matchedOrgs: MatchedOrg[];
    /** Map of targetOrgId → { status, requestId } for pre-resolved button states */
    meetingStatusMap: Record<string, { status: MeetingStatus; requestId?: string }>;
}

export default function OrgMatchWidget({
    eventId,
    callerOrgId,
    matchedOrgs,
    meetingStatusMap,
}: OrgMatchWidgetProps) {
    if (matchedOrgs.length === 0) return null;

    const hasAiResults = matchedOrgs.some((o) => o.source === "ai");

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                        {hasAiResults
                            ? <Sparkles className="w-4 h-4 text-primary" />
                            : <Building2 className="w-4 h-4 text-primary" />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">Orgs at this event</h3>
                        <p className="text-xs text-gray-500">Matched to your profile</p>
                    </div>
                </div>
                {hasAiResults && (
                    <Badge variant="outline" className="text-primary border-primary/30 text-[10px] gap-1 px-1.5">
                        <Zap className="w-3 h-3" />AI
                    </Badge>
                )}
            </div>

            {/* Org Cards */}
            <div className="space-y-3">
                {matchedOrgs.map((org) => {
                    const meetingState = meetingStatusMap[org.id] ?? { status: "NONE" as MeetingStatus };

                    return (
                        <div key={org.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-primary/20 hover:bg-primary/5 transition-all">
                            {/* Org logo */}
                            {org.logo ? (
                                <Image
                                    src={org.logo} alt={org.name}
                                    width={36} height={36}
                                    className="rounded-md object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <Building2 className="w-4 h-4 text-gray-500" />
                                </div>
                            )}

                            {/* Org info */}
                            <div className="flex-1 min-w-0">
                                <Link href={`/organizations/${org.id}`} className="font-semibold text-sm hover:text-primary transition-colors truncate block">
                                    {org.name}
                                </Link>
                                {org.industry && (
                                    <p className="text-xs text-gray-500 truncate">{org.industry.label}</p>
                                )}
                                <p className="text-xs text-primary/70 mt-0.5 truncate">{org.matchReason}</p>

                                {/* Meeting request button */}
                                <div className="mt-2">
                                    <MeetingRequestButton
                                        eventId={eventId}
                                        targetOrgId={org.id}
                                        targetOrgName={org.name}
                                        initialStatus={meetingState.status}
                                        initialRequestId={meetingState.requestId}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-xs text-gray-400 mt-3 text-center">
                Only visible to registered attendees
            </p>
        </div>
    );
}
