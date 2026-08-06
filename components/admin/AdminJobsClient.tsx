"use client";

import { useState, useTransition } from "react";
import {
    listJobQueueAdminAction,
    requeueJobAdminAction,
    requeueAllFailedJobsAdminAction,
    cancelJobAdminAction,
    deleteJobAdminAction,
} from "@/actions/admin.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    RotateCw,
    Search,
    AlertCircle,
    CheckCircle2,
    Clock,
    Activity,
    XCircle,
    Settings,
    ChevronLeft,
    ChevronRight,
    Loader2,
    RefreshCw,
    Trash2,
    Code,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

export interface JobQueueAdminItem {
    id: string;
    type: string;
    payload: any;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
    attempts: number;
    maxAttempts: number;
    scheduledAt: string;
    processedAt: string | null;
    error: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AdminJobsInitialData {
    jobs: JobQueueAdminItem[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    stats: {
        failed: number;
        pending: number;
        processing: number;
        completed: number;
        cancelled: number;
    };
}

const JOB_TYPES = [
    "ALL",
    "SEND_NOTIFICATION",
    "SEND_INVITE_EMAIL",
    "SEND_EVENT_REMINDER",
    "SCAN_UPLOAD",
    "TRIGGER_N8N_WORKFLOW",
    "GENERATE_REPORT",
    "GENERATE_TASKLIST",
    "CLEANUP_DATA",
    "EMBED_EVENT",
    "EMBED_ORG",
    "ANALYSE_FEEDBACK_SENTIMENT",
    "SEND_PAYMENT_RECEIPT",
    "ORG_WEBHOOK_DELIVERY",
    "VERIFY_ORG_LEVEL_1",
    "VERIFY_ORG_LEVEL_2",
    "SEND_EVENT_INVITE_EMAIL",
    "VIRTUAL_ROOM_OPENED",
];

export function AdminJobsClient({ initial }: { initial: AdminJobsInitialData }) {
    const [data, setData] = useState(initial);
    const [statusFilter, setStatusFilter] = useState<string>("FAILED");
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [page, setPage] = useState<number>(1);
    const [expandedPayloads, setExpandedPayloads] = useState<Record<string, boolean>>({});

    const [isPending, startTransition] = useTransition();
    const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [loadingJobId, setLoadingJobId] = useState<string | null>(null);

    const togglePayload = (id: string) => {
        setExpandedPayloads(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const fetchPage = (newPage: number, status = statusFilter, type = typeFilter, search = searchQuery) => {
        startTransition(async () => {
            const res = await listJobQueueAdminAction({
                page: newPage,
                limit: 15,
                status,
                type,
                search,
            });
            if (res.success) {
                setData(res.data);
                setPage(newPage);
            } else {
                setActionMsg({ type: "error", text: res.error });
            }
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchPage(1, statusFilter, typeFilter, searchQuery);
    };

    const handleStatusTab = (status: string) => {
        setStatusFilter(status);
        fetchPage(1, status, typeFilter, searchQuery);
    };

    const handleTypeChange = (type: string) => {
        setTypeFilter(type);
        fetchPage(1, statusFilter, type, searchQuery);
    };

    const handleRequeueSingle = (jobId: string) => {
        setLoadingJobId(jobId);
        setActionMsg(null);
        startTransition(async () => {
            const res = await requeueJobAdminAction(jobId);
            setLoadingJobId(null);
            if (res.success) {
                setActionMsg({ type: "success", text: res.message });
                fetchPage(page);
            } else {
                setActionMsg({ type: "error", text: res.error });
            }
        });
    };

    const handleRequeueAllFailed = () => {
        setActionMsg(null);
        startTransition(async () => {
            const res = await requeueAllFailedJobsAdminAction(typeFilter);
            if (res.success) {
                setActionMsg({ type: "success", text: res.message });
                fetchPage(1, "FAILED");
            } else {
                setActionMsg({ type: "error", text: res.error });
            }
        });
    };

    const handleCancelSingle = (jobId: string) => {
        setLoadingJobId(jobId);
        setActionMsg(null);
        startTransition(async () => {
            const res = await cancelJobAdminAction(jobId);
            setLoadingJobId(null);
            if (res.success) {
                setActionMsg({ type: "success", text: res.message });
                fetchPage(page);
            } else {
                setActionMsg({ type: "error", text: res.error });
            }
        });
    };

    const handleDeleteSingle = (jobId: string) => {
        setLoadingJobId(jobId);
        setActionMsg(null);
        startTransition(async () => {
            const res = await deleteJobAdminAction(jobId);
            setLoadingJobId(null);
            if (res.success) {
                setActionMsg({ type: "success", text: res.message });
                fetchPage(page);
            } else {
                setActionMsg({ type: "error", text: res.error });
            }
        });
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case "FAILED":
                return <Badge className="bg-red-100 text-red-800 border-red-200"><AlertCircle className="h-3 w-3 mr-1" /> FAILED</Badge>;
            case "PENDING":
                return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="h-3 w-3 mr-1" /> PENDING</Badge>;
            case "PROCESSING":
                return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Activity className="h-3 w-3 mr-1 animate-spin" /> PROCESSING</Badge>;
            case "COMPLETED":
                return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" /> COMPLETED</Badge>;
            case "CANCELLED":
                return <Badge className="bg-gray-100 text-gray-700 border-gray-200"><XCircle className="h-3 w-3 mr-1" /> CANCELLED</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="h-6 w-6 text-indigo-600" />
                        Background Job Queue Console
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Monitor, filter, retry, and manage all background workers (email, notifications, n8n, scans, reports).
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchPage(page)}
                        disabled={isPending}
                    >
                        <RefreshCw className={`h-4 w-4 mr-1.5 ${isPending ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleRequeueAllFailed}
                        disabled={isPending || data.stats.failed === 0}
                    >
                        {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RotateCw className="h-4 w-4 mr-1.5" />}
                        Re-queue All Failed ({data.stats.failed})
                    </Button>
                </div>
            </div>

            {/* Notification alert */}
            {actionMsg && (
                <div className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
                    actionMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-red-50 text-red-800 border-red-200"
                }`}>
                    <div className="flex items-center gap-2">
                        {actionMsg.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        <span>{actionMsg.text}</span>
                    </div>
                    <button onClick={() => setActionMsg(null)} className="text-xs underline">Dismiss</button>
                </div>
            )}

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div
                    onClick={() => handleStatusTab("FAILED")}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        statusFilter === "FAILED" ? "bg-red-50 border-red-300 ring-2 ring-red-400" : "bg-white border-gray-200 hover:border-red-200"
                    }`}
                >
                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Failed</p>
                    <p className="text-2xl font-bold text-red-900 mt-1">{data.stats.failed}</p>
                </div>
                <div
                    onClick={() => handleStatusTab("PENDING")}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        statusFilter === "PENDING" ? "bg-yellow-50 border-yellow-300 ring-2 ring-yellow-400" : "bg-white border-gray-200 hover:border-yellow-200"
                    }`}
                >
                    <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wider">Pending</p>
                    <p className="text-2xl font-bold text-yellow-900 mt-1">{data.stats.pending}</p>
                </div>
                <div
                    onClick={() => handleStatusTab("PROCESSING")}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        statusFilter === "PROCESSING" ? "bg-blue-50 border-blue-300 ring-2 ring-blue-400" : "bg-white border-gray-200 hover:border-blue-200"
                    }`}
                >
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Processing</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{data.stats.processing}</p>
                </div>
                <div
                    onClick={() => handleStatusTab("COMPLETED")}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        statusFilter === "COMPLETED" ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400" : "bg-white border-gray-200 hover:border-emerald-200"
                    }`}
                >
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Completed</p>
                    <p className="text-2xl font-bold text-emerald-900 mt-1">{data.stats.completed}</p>
                </div>
                <div
                    onClick={() => handleStatusTab("CANCELLED")}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        statusFilter === "CANCELLED" ? "bg-gray-100 border-gray-300 ring-2 ring-gray-400" : "bg-white border-gray-200 hover:border-gray-200"
                    }`}
                >
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Cancelled</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{data.stats.cancelled}</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-medium overflow-x-auto max-w-full">
                        {["FAILED", "PENDING", "PROCESSING", "COMPLETED", "CANCELLED", "ALL"].map((st) => (
                            <button
                                key={st}
                                onClick={() => handleStatusTab(st)}
                                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                                    statusFilter === st
                                        ? "bg-white text-gray-900 shadow-sm font-semibold"
                                        : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                {st === "ALL" ? "All Statuses" : st}
                            </button>
                        ))}
                    </div>

                    {/* Job Type Select */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">Job Type:</span>
                        <select
                            value={typeFilter}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            className="text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            {JOB_TYPES.map((jt) => (
                                <option key={jt} value={jt}>
                                    {jt === "ALL" ? "All Job Types" : jt.replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by Job ID or Error message..."
                            className="pl-9 text-xs"
                        />
                    </div>
                    <Button type="submit" variant="secondary" size="sm">Search</Button>
                </form>
            </div>

            {/* Jobs Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-600">
                        <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="p-4">Status & Type</th>
                                <th className="p-4">Payload / Info</th>
                                <th className="p-4">Attempts</th>
                                <th className="p-4">Error / Verdict</th>
                                <th className="p-4">Timestamps</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">
                                        No job queue entries found matching current filters.
                                    </td>
                                </tr>
                            ) : (
                                data.jobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                                        {/* Status & Type */}
                                        <td className="p-4 space-y-1">
                                            <div>{statusBadge(job.status)}</div>
                                            <div className="font-mono text-[11px] text-gray-800 font-semibold">{job.type}</div>
                                            <div className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]" title={job.id}>
                                                ID: {job.id}
                                            </div>
                                        </td>

                                        {/* Payload preview */}
                                        <td className="p-4 max-w-[280px]">
                                            <button
                                                onClick={() => togglePayload(job.id)}
                                                className="flex items-center gap-1 text-[11px] font-mono text-indigo-600 hover:underline mb-1"
                                            >
                                                <Code className="h-3 w-3" />
                                                {expandedPayloads[job.id] ? "Hide Payload" : "View Payload"}
                                                {expandedPayloads[job.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                            </button>
                                            {expandedPayloads[job.id] ? (
                                                <pre className="p-2 bg-gray-900 text-emerald-400 rounded-lg text-[10px] font-mono overflow-x-auto max-h-36">
                                                    {JSON.stringify(job.payload, null, 2)}
                                                </pre>
                                            ) : (
                                                <p className="text-[11px] text-gray-500 font-mono truncate">
                                                    {JSON.stringify(job.payload)}
                                                </p>
                                            )}
                                        </td>

                                        {/* Attempts */}
                                        <td className="p-4 text-[11px]">
                                            <span className={`font-mono font-bold ${
                                                job.attempts >= job.maxAttempts ? "text-red-600" : "text-gray-700"
                                            }`}>
                                                {job.attempts} / {job.maxAttempts}
                                            </span>
                                        </td>

                                        {/* Error / Verdict */}
                                        <td className="p-4 max-w-[240px]">
                                            {job.error ? (
                                                <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg font-mono leading-relaxed break-words">
                                                    {job.error}
                                                </p>
                                            ) : (
                                                <span className="text-gray-400 italic text-[11px]">None</span>
                                            )}
                                        </td>

                                        {/* Timestamps */}
                                        <td className="p-4 text-[11px] text-gray-500 space-y-0.5">
                                            <p>Updated: {format(new Date(job.updatedAt), "MMM d, HH:mm:ss")}</p>
                                            <p className="text-gray-400">Scheduled: {format(new Date(job.scheduledAt), "MMM d, HH:mm:ss")}</p>
                                            {job.processedAt && (
                                                <p className="text-emerald-600">Processed: {format(new Date(job.processedAt), "MMM d, HH:mm:ss")}</p>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="p-4 text-right space-x-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs"
                                                disabled={isPending && loadingJobId === job.id}
                                                onClick={() => handleRequeueSingle(job.id)}
                                                title="Reset to PENDING & re-run"
                                            >
                                                {loadingJobId === job.id ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                                ) : (
                                                    <RotateCw className="h-3.5 w-3.5 mr-1" />
                                                )}
                                                Re-queue
                                            </Button>

                                            {job.status !== "CANCELLED" && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-xs text-amber-700 hover:bg-amber-50"
                                                    disabled={isPending && loadingJobId === job.id}
                                                    onClick={() => handleCancelSingle(job.id)}
                                                    title="Mark as CANCELLED"
                                                >
                                                    Cancel
                                                </Button>
                                            )}

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-xs text-red-600 hover:bg-red-50 p-1.5"
                                                disabled={isPending && loadingJobId === job.id}
                                                onClick={() => handleDeleteSingle(job.id)}
                                                title="Delete Job"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer */}
                <div className="bg-gray-50/80 px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                    <p>
                        Showing Page <span className="font-semibold text-gray-800">{data.currentPage}</span> of{" "}
                        <span className="font-semibold text-gray-800">{data.totalPages}</span> ({data.totalCount} total jobs)
                    </p>
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={data.currentPage <= 1 || isPending}
                            onClick={() => fetchPage(data.currentPage - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" /> Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={data.currentPage >= data.totalPages || isPending}
                            onClick={() => fetchPage(data.currentPage + 1)}
                        >
                            Next <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
