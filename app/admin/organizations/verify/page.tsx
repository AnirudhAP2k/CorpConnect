import { getAdminVerificationQueue } from "@/data/dashboard";
import { format } from "date-fns";
import Link from "next/link";
import { Building2, Clock, CheckCircle2, XCircle, AlertTriangle, Users, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
    searchParams: Promise<{ page?: string }>;
}

const SCORE_COLOR = (score: number | null) => {
    if (score === null) return "text-gray-400";
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-500";
};

const SCORE_BAR = (score: number | null) => {
    if (score === null) return "bg-gray-200";
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
};

export default async function AdminVerifyPage({ searchParams }: Props) {
    const { page } = await searchParams;
    const pageNum = parseInt(page ?? "1", 10);
    const take = 15;
    const skip = (pageNum - 1) * take;

    const { orgs, total } = await getAdminVerificationQueue(skip, take);
    const totalPages = Math.ceil(total / take);

    return (
        <div className="p-8 space-y-6 max-w-6xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Verification Queue</h1>
                    </div>
                    <p className="text-sm text-gray-500 ml-10">
                        Organizations that passed automated Level 1 KYB checks and require manual review.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="text-3xl font-bold text-amber-600">{total}</span>
                    <span className="text-xs text-gray-500">awaiting review</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs text-gray-500 bg-gray-50 rounded-xl p-3 border border-gray-100">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Score ≥ 80 — Strong signals</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" /> Score 60–79 — Moderate signals</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" /> Score &lt; 60 — Weak signals (should not appear here)</span>
            </div>

            {/* Queue */}
            {orgs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50">
                    <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-3" />
                    <p className="font-semibold text-gray-700 text-lg">All clear!</p>
                    <p className="text-sm text-gray-400 mt-1">No organizations are pending verification.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {orgs.map((org) => {
                        const score = (org as any).meta?.verificationScore as number | null;
                        const hasRegistration = !!(org as any).meta?.registrationNumber;

                        return (
                            <Link
                                key={org.id}
                                href={`/admin/organizations/verify/${org.id}`}
                                className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all duration-200"
                            >
                                {/* Logo */}
                                <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-indigo-100">
                                    {org.logo ? (
                                        <img src={org.logo} alt={org.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <Building2 className="h-6 w-6 text-indigo-400" />
                                    )}
                                </div>

                                {/* Main info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                                            {org.name}
                                        </span>
                                        <Badge variant="outline" className="text-[10px] border-gray-200">
                                            {org.industry.label}
                                        </Badge>
                                        {org.size && (
                                            <Badge variant="outline" className="text-[10px] border-gray-200">
                                                {org.size}
                                            </Badge>
                                        )}
                                        {hasRegistration && (
                                            <Badge className="text-[10px] bg-blue-50 text-blue-600 border-0">
                                                Reg# provided
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                                        {org.website && (
                                            <span className="truncate max-w-[200px]">{org.website}</span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3 w-3" />{org._count.members} members
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />{org._count.events} events
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            Registered {format(new Date(org.createdAt), "MMM d, yyyy")}
                                        </span>
                                    </div>
                                </div>

                                {/* Score */}
                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-2xl font-bold ${SCORE_COLOR(score)}`}>
                                            {score ?? "—"}
                                        </span>
                                        <span className="text-xs text-gray-400">/100</span>
                                    </div>
                                    <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${SCORE_BAR(score)} transition-all`}
                                            style={{ width: `${score ?? 0}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-400">L1 Score</span>
                                </div>

                                {/* Arrow */}
                                <span className="text-gray-300 group-hover:text-indigo-400 transition-colors text-lg ml-1">→</span>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm pt-2">
                    <span className="text-gray-400">
                        Showing {skip + 1}–{Math.min(skip + take, total)} of {total}
                    </span>
                    <div className="flex gap-2">
                        {pageNum > 1 && (
                            <Link href={`?page=${pageNum - 1}`}
                                className="px-4 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
                                ← Previous
                            </Link>
                        )}
                        {pageNum < totalPages && (
                            <Link href={`?page=${pageNum + 1}`}
                                className="px-4 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
                                Next →
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
