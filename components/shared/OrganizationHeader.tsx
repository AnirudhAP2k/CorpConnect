import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Users, CheckCircle2 } from "lucide-react";

interface OrganizationHeaderProps {
    organization: {
        id: string;
        name: string;
        logo: string | null;
        industry: {
            id: string;
            label: string;
        };
        location?: string | null;
        size?: string | null;
        isVerified: boolean;
    };
    children?: React.ReactNode;
}

const OrganizationHeader = ({ organization, children }: OrganizationHeaderProps) => {
    const getSizeBadgeVariant = (size: string | null | undefined) => {
        if (!size) return "default";
        switch (size) {
            case "STARTUP":
                return "startup";
            case "SME":
                return "sme";
            case "ENTERPRISE":
                return "enterprise";
            default:
                return "default";
        }
    };

    const getSizeLabel = (size: string | null | undefined) => {
        if (!size) return null;
        switch (size) {
            case "STARTUP":
                return "Startup";
            case "SME":
                return "SME";
            case "ENTERPRISE":
                return "Enterprise";
            default:
                return size;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Logo */}
                <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                        {organization.logo ? (
                            <Image
                                src={organization.logo}
                                alt={organization.name}
                                width={96}
                                height={96}
                                className="object-cover w-full h-full"
                            />
                        ) : (
                            <Building2 className="w-12 h-12 text-gray-400" />
                        )}
                    </div>
                </div>

                {/* Organization Info */}
                <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <h1 className="text-2xl font-bold">{organization.name}</h1>
                                {organization.isVerified && (
                                    <Badge variant="verified" className="flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Verified
                                    </Badge>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                {/* Industry */}
                                <div className="flex items-center gap-1">
                                    <Building2 className="w-4 h-4" />
                                    <span>{organization.industry.label}</span>
                                </div>

                                {/* Location */}
                                {organization.location && (
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        <span>{organization.location}</span>
                                    </div>
                                )}

                                {/* Size */}
                                {organization.size && (
                                    <Badge variant={getSizeBadgeVariant(organization.size) as any}>
                                        <Users className="w-3 h-3 mr-1" />
                                        {getSizeLabel(organization.size)}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons Slot */}
                        {children && <div className="flex gap-2">{children}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationHeader;
