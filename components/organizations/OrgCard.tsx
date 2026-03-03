import Image from "next/image";
import Link from "next/link";
import { MapPin, Users, Calendar, CheckCircle, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OrgCardProps {
    org: {
        id: string;
        name: string;
        description: string | null;
        logo: string | null;
        location: string | null;
        size: string | null;
        isVerified: boolean;
        website: string | null;
        industry: { id: string; label: string };
        orgTags: { tag: { id: string; label: string } }[];
        _count: { members: number; events: number };
    };
}

const SIZE_LABELS: Record<string, string> = {
    STARTUP: "Startup",
    SME: "SME",
    ENTERPRISE: "Enterprise",
};

// Pure Server Component — no JS sent to client
export default function OrgCard({ org }: OrgCardProps) {
    return (
        <Link
            href={`/organizations/${org.id}`}
            className="group block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-200"
        >
            {/* Card top accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-primary/60 to-primary" />

            <div className="p-5">
                {/* Header row */}
                <div className="flex items-start gap-3 mb-3">
                    {/* Logo */}
                    <div className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        {org.logo ? (
                            <Image
                                src={org.logo}
                                alt={org.name}
                                fill
                                className="object-cover"
                                sizes="48px"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-gray-400" />
                            </div>
                        )}
                    </div>

                    {/* Name + industry */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                                {org.name}
                            </h3>
                            {org.isVerified && (
                                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" aria-label="Verified" />
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{org.industry.label}</p>
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 line-clamp-2 mb-3 min-h-[2.5rem]">
                    {org.description ?? "No description provided."}
                </p>

                {/* Tags */}
                {org.orgTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {org.orgTags.slice(0, 4).map(({ tag }) => (
                            <Badge
                                key={tag.id}
                                variant="secondary"
                                className="text-xs px-2 py-0.5 bg-primary/8 text-primary border-primary/20"
                            >
                                {tag.label}
                            </Badge>
                        ))}
                        {org.orgTags.length > 4 && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                                +{org.orgTags.length - 4}
                            </Badge>
                        )}
                    </div>
                )}

                {/* Footer meta */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {org._count.members}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {org._count.events}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {org.location && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="truncate max-w-[100px]">{org.location}</span>
                            </span>
                        )}
                        {org.size && (
                            <Badge variant="outline" className="text-xs">
                                {SIZE_LABELS[org.size] ?? org.size}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
