import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Building2, User } from "lucide-react";

type ParticipationStatus = "REGISTERED" | "ATTENDED" | "CANCELLED" | "WAITLISTED";

interface Participant {
    id: string;
    status: ParticipationStatus;
    registeredAt: Date;
    attendedAt?: Date | null;
    user: {
        id: string;
        name: string | null;
        image: string | null;
        email?: string | null;
    };
    organization?: {
        id: string;
        name: string;
        logo: string | null;
    } | null;
}

interface EventParticipantsPanelProps {
    participants: Participant[];
    isHost: boolean;
    totalCount: number;
}

const statusConfig: Record<ParticipationStatus, { label: string; className: string }> = {
    REGISTERED: { label: "Registered", className: "bg-blue-100 text-blue-700" },
    ATTENDED: { label: "Attended", className: "bg-green-100 text-green-700" },
    CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700" },
    WAITLISTED: { label: "Waitlisted", className: "bg-yellow-100 text-yellow-700" },
};

export default function EventParticipantsPanel({
    participants,
    isHost,
    totalCount,
}: EventParticipantsPanelProps) {
    const active = participants.filter(
        (p) => p.status === "REGISTERED" || p.status === "ATTENDED"
    );

    if (active.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold mb-2">Attendees</h2>
                <p className="text-gray-500 text-sm">No registrations yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                    Attendees{" "}
                    <span className="text-gray-500 font-normal text-base">
                        ({totalCount})
                    </span>
                </h2>
                {isHost && (
                    <Badge className="bg-purple-100 text-purple-700">Host View</Badge>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {active.map((p) => {
                    const status = statusConfig[p.status];
                    const avatarLetter =
                        p.organization?.name?.charAt(0) || p.user.name?.charAt(0) || "?";

                    return (
                        <div
                            key={p.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                            {/* Avatar */}
                            {p.organization?.logo ? (
                                <Image
                                    src={p.organization.logo}
                                    alt={p.organization.name}
                                    width={40}
                                    height={40}
                                    className="rounded-full object-cover flex-shrink-0"
                                />
                            ) : p.user.image ? (
                                <Image
                                    src={p.user.image}
                                    alt={p.user.name || "User"}
                                    width={40}
                                    height={40}
                                    className="rounded-full object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                                    {p.organization ? (
                                        <Building2 className="w-5 h-5 text-primary-600" />
                                    ) : (
                                        <User className="w-5 h-5 text-primary-600" />
                                    )}
                                </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                    {p.organization?.name || p.user.name || "Unknown"}
                                </p>
                                {p.organization && (
                                    <p className="text-xs text-gray-500 truncate">{p.user.name}</p>
                                )}
                                {isHost && p.user.email && (
                                    <p className="text-xs text-gray-400 truncate">{p.user.email}</p>
                                )}
                            </div>

                            {/* Status */}
                            <Badge className={`${status.className} text-xs flex-shrink-0`}>
                                {status.label}
                            </Badge>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
