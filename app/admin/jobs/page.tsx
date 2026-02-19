import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, CheckCircle, AlertCircle, Clock, Activity, XCircle } from "lucide-react";
import { getAdminJobQueueHealth } from "@/data/dashboard";
import { format } from "date-fns";

export default async function AdminJobsPage() {
    const health = await getAdminJobQueueHealth();

    const statusConfig = [
        { key: "pending", label: "Pending", count: health.pending, icon: Clock, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
        { key: "processing", label: "Processing", count: health.processing, icon: Activity, color: "text-blue-600 bg-blue-50 border-blue-200" },
        { key: "completed", label: "Completed", count: health.completed, icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-200" },
        { key: "failed", label: "Failed", count: health.failed, icon: AlertCircle, color: "text-red-600 bg-red-50 border-red-200" },
        { key: "cancelled", label: "Cancelled", count: health.cancelled, icon: XCircle, color: "text-gray-500 bg-gray-50 border-gray-200" },
    ];

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Job Queue</h1>
                <p className="text-muted-foreground text-sm mt-1">Background task status — email delivery, notifications, reports</p>
            </div>

            {/* Status grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {statusConfig.map((s) => (
                    <div key={s.key} className={`rounded-xl border p-4 text-center ${s.color}`}>
                        <s.icon className="h-6 w-6 mx-auto mb-2" />
                        <div className="text-3xl font-bold">{s.count.toLocaleString()}</div>
                        <div className="text-sm font-medium mt-0.5">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Failed jobs detail */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        Failed Jobs
                        {health.failed > 0 && (
                            <Badge className="bg-red-100 text-red-700 border-0 ml-1">{health.failed}</Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {health.recentFailed.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                            <p className="font-medium text-green-700">No failed jobs</p>
                            <p className="text-xs text-muted-foreground mt-1">All jobs completed successfully</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {health.recentFailed.map((job) => (
                                <div key={job.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-red-700 border-red-300 text-[10px]">
                                                {job.type.replace(/_/g, " ")}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {job.attempts} attempt{job.attempts !== 1 ? "s" : ""}
                                            </span>
                                            <span className="text-xs text-muted-foreground ml-auto">
                                                {format(new Date(job.updatedAt), "MMM d, h:mm a")}
                                            </span>
                                        </div>
                                        <p className="text-xs text-red-700 break-words">{job.error ?? "No error message recorded"}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">ID: {job.id}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Job types info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Job Types</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {["SEND_INVITE_EMAIL", "SEND_NOTIFICATION", "SEND_EVENT_REMINDER", "GENERATE_REPORT", "CLEANUP_DATA"].map((type) => (
                            <div key={type} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                                <Settings className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs font-medium">{type.replace(/_/g, " ")}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
