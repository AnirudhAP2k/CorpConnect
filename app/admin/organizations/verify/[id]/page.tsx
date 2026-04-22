import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAdminOrgDetail } from "@/data/dashboard";
import { OrgVerificationDetail } from "@/components/admin/OrgVerificationDetail";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function AdminOrgVerifyDetailPage({ params }: Props) {
    const { id } = await params;
    const org = await getAdminOrgDetail(id);

    if (!org) notFound();

    if (org.meta?.verificationStatus !== "IN_REVIEW") {
        return (
            <div className="p-8 max-w-xl">
                <Link href="/admin/organizations/verify"
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Queue
                </Link>
                <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
                    <p className="text-lg font-semibold text-gray-700">
                        This organization is no longer in review.
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        Current status: <span className="font-medium">{org.meta?.verificationStatus ?? "PENDING"}</span>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Breadcrumb */}
            <div className="px-8 pt-6">
                <Link href="/admin/organizations/verify"
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit">
                    <ArrowLeft className="h-4 w-4" /> Back to Verification Queue
                </Link>
            </div>

            <OrgVerificationDetail org={org as any} />
        </div>
    );
}
