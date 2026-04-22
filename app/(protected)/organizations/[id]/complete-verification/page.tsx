import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, ShieldCheck, Clock, AlertTriangle,
    CheckCircle2, FileText, Building2,
} from "lucide-react";
import { OrgKybForm } from "@/components/shared/OrgKybForm";

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
    params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
    const { id } = await params;
    const org = await prisma.organization.findUnique({ where: { id }, select: { name: true } });
    return { title: `Complete Verification — ${org?.name ?? "Organization"}` };
}

export default async function CompleteVerificationPage({ params }: Props) {
    const { id: orgId } = await params;
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) redirect("/login");

    // Verify the user is an OWNER/ADMIN of this org
    const member = await prisma.organizationMember.findFirst({
        where: { organizationId: orgId, userId },
        select: { role: true },
    });
    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
        redirect(`/organizations/${orgId}`);
    }

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
            id: true, name: true, logo: true,
            isVerified: true,
            meta: {
                select: {
                    verificationStatus: true,
                    verificationScore: true,
                    registrationNumber: true,
                    jurisdiction: true,
                    taxId: true,
                    incorporationDate: true,
                    registeredAddress: true,
                },
            },
            orgDocuments: {
                where: { docType: { in: ["INCORPORATION_CERT", "TAX_CERTIFICATE", "ADDRESS_PROOF", "OTHER_KYB", "LEGAL_COMPLIANCE"] as any[] } },
                select: { id: true, docType: true, title: true, taxRefNumber: true, createdAt: true },
                orderBy: { createdAt: "asc" },
            },
        },
    });
    if (!org) notFound();

    const status = org.meta?.verificationStatus ?? "PENDING";
    const isVerified = org.isVerified;

    // ── Status banner config ─────────────────────────────────────────────────
    const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string; bg: string; desc: string }> = {
        PENDING: { icon: Clock, label: "Running Automated Checks", color: "text-gray-600", bg: "bg-gray-50 border-gray-200", desc: "We are running initial safety checks on your organization. This takes just a moment." },
        AWAITING_DOCS: { icon: Clock, label: "Passed L1 - Action Required", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", desc: "Initial checks passed! Complete your company details and upload documents below to start manual review." },
        IN_REVIEW: { icon: Clock, label: "Under Review", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", desc: "Our team is reviewing your submission. This usually takes 1-2 business days." },
        VERIFIED: { icon: CheckCircle2, label: "Verified ✓", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", desc: "Your organization is fully verified and can use all platform features." },
        REJECTED: { icon: AlertTriangle, label: "Rejected", color: "text-red-700", bg: "bg-red-50 border-red-200", desc: "Your application was rejected. Update your information and resubmit." },
    };
    const cfg = statusConfig[status] ?? statusConfig.PENDING;
    const StatusIcon = cfg.icon;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top bar */}
            <div className="bg-white border-b">
                <div className="wrapper py-5 flex items-center gap-4">
                    <Link
                        href={`/organizations/${orgId}`}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
                    >
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                        Back to organization
                    </Link>
                    <div className="h-5 w-px bg-gray-200" />
                    <div className="flex items-center gap-2">
                        {org.logo
                            ? <img src={org.logo} alt={org.name} className="h-7 w-7 rounded-lg object-cover border" />
                            : <Building2 className="h-6 w-6 text-gray-400" />
                        }
                        <span className="font-semibold text-gray-900">{org.name}</span>
                    </div>
                </div>
            </div>

            <div className="wrapper py-8 max-w-3xl">
                {/* Page heading */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-indigo-500" />
                        Complete Organization Verification
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        KYB (Know Your Business) verification is required to host events,
                        participate in matchmaking, and unlock all platform features.
                    </p>
                </div>

                {/* Current status banner */}
                <div className={`flex items-start gap-3 rounded-2xl border p-4 mb-6 ${cfg.bg}`}>
                    <StatusIcon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                    <div>
                        <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{cfg.desc}</p>
                    </div>
                </div>

                {/* What unlocks on verification */}
                {!isVerified && (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 mb-6">
                        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">
                            What you unlock after verification
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                                "Host public & paid events",
                                "AI-powered org matchmaking",
                                "Meeting requests from partners",
                                "Verified badge on your profile",
                                "Access to analytics & reports",
                                "Priority support",
                            ].map((item) => (
                                <div key={item} className="flex items-center gap-2 text-sm text-indigo-800">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Previously uploaded docs summary */}
                {org.orgDocuments.length > 0 && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 mb-6">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            <FileText className="inline h-3.5 w-3.5 mr-1" />
                            Previously Uploaded Documents ({org.orgDocuments.length})
                        </p>
                        <div className="space-y-2">
                            {org.orgDocuments.map((doc) => (
                                <div key={doc.id} className="flex items-center gap-3 text-sm text-gray-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                    <span className="flex-1">{doc.title}</span>
                                    {doc.taxRefNumber && (
                                        <span className="font-mono text-xs text-gray-400">{doc.taxRefNumber}</span>
                                    )}
                                    <span className="text-xs text-gray-400">
                                        {doc.docType.replace(/_/g, " ")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* The main form — disabled if already verified or PENDING L1 */}
                {isVerified ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                        <h2 className="text-lg font-semibold text-emerald-800">Organization is Verified</h2>
                        <p className="text-sm text-emerald-600 mt-1">
                            All platform features are unlocked for {org.name}.
                        </p>
                        <Link href={`/organizations/${orgId}`} className="inline-block mt-4">
                            <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
                                Go to Organization
                            </button>
                        </Link>
                    </div>
                ) : status === "PENDING" ? (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
                        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3 animate-pulse" />
                        <h2 className="text-lg font-semibold text-gray-800">Running Level-1 Validations</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Our automated system is performing background checks on your organization. Please refresh the page in a few moments to unlock document uploads.
                        </p>
                    </div>
                ) : (
                    <OrgKybForm
                        orgId={orgId}
                        initialMeta={{
                            verificationStatus: org.meta?.verificationStatus ?? "PENDING",
                            registrationNumber: org.meta?.registrationNumber ?? undefined,
                            jurisdiction: org.meta?.jurisdiction ?? undefined,
                            taxId: org.meta?.taxId ?? undefined,
                            incorporationDate: org.meta?.incorporationDate as any ?? undefined,
                            registeredAddress: org.meta?.registeredAddress ?? undefined,
                        }}
                    />
                )}
            </div>
        </div>
    );
}
