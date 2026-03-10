import Link from "next/link";
import { Building2, MapPin } from "lucide-react";

export default function GroupMembers({ members }: { members: any[] }) {
    if (!members || members.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                No organizations have joined this group yet.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
                <Link
                    key={member.id}
                    href={`/organizations/profile/${member.organization.id}`}
                    className="block bg-card rounded-lg border p-4 hover:border-primary/50 transition-colors"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            {member.organization.logo ? (
                                <img
                                    src={member.organization.logo}
                                    alt={member.organization.name}
                                    className="w-full h-full object-cover rounded-lg"
                                />
                            ) : (
                                <Building2 className="w-6 h-6 text-primary" />
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <h3 className="font-semibold text-lg line-clamp-1">
                                {member.organization.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{member.organization.location || "Location not set"}</span>
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
