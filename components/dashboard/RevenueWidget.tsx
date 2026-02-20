import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, TrendingUp, CreditCard } from "lucide-react";

interface RevenueWidgetProps {
    totalRevenue: number;
    paidParticipations: number;
    monthly?: { month: string; revenue: number }[];
    topItems?: { id: string; title?: string; name?: string; revenue: number; count: number }[];
    label?: string; // e.g. "Top Events" or "Top Organizations"
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function RevenueWidget({
    totalRevenue,
    paidParticipations,
    monthly = [],
    topItems = [],
    label = "Top Events",
}: RevenueWidgetProps) {
    const avgRevenue = paidParticipations > 0 ? totalRevenue / paidParticipations : 0;
    const maxMonthlyRevenue = Math.max(...monthly.map((m) => m.revenue), 1);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Revenue Overview
                </CardTitle>
                <CardDescription>
                    From paid event participations · Stripe/Razorpay integration coming soon
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-700">
                            {formatCurrency(totalRevenue)}
                        </div>
                        <div className="text-xs text-green-600 mt-0.5">Total Revenue</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-700">
                            {paidParticipations}
                        </div>
                        <div className="text-xs text-blue-600 mt-0.5">Paid Registrations</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-lg font-bold text-purple-700">
                            {formatCurrency(avgRevenue)}
                        </div>
                        <div className="text-xs text-purple-600 mt-0.5">Avg per Registration</div>
                    </div>
                </div>

                {/* Monthly chart (bar) */}
                {monthly.length > 0 && (
                    <div>
                        <div className="text-sm font-medium mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            Monthly Revenue
                        </div>
                        <div className="flex items-end gap-1 h-24">
                            {monthly.map((m) => (
                                <div
                                    key={m.month}
                                    className="flex-1 flex flex-col items-center gap-1 group"
                                    title={`${m.month}: ${formatCurrency(m.revenue)}`}
                                >
                                    <div
                                        className="w-full bg-primary/20 group-hover:bg-primary/40 rounded-t transition-colors"
                                        style={{ height: `${(m.revenue / maxMonthlyRevenue) * 80}px`, minHeight: "4px" }}
                                    />
                                    <span className="text-[10px] text-muted-foreground">
                                        {m.month.slice(5)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Top items */}
                {topItems.length > 0 && (
                    <div>
                        <div className="text-sm font-medium mb-2 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            {label}
                        </div>
                        <div className="space-y-2">
                            {topItems.map((item, i) => (
                                <div key={item.id} className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm truncate">{item.title ?? item.name}</div>
                                        <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                                            <div
                                                className="h-full bg-primary/60 rounded-full"
                                                style={{ width: `${(item.revenue / (topItems[0].revenue || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium text-right">
                                        {formatCurrency(item.revenue)}
                                        <div className="text-xs text-muted-foreground">{item.count} sales</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Payment gateway placeholder */}
                {totalRevenue === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-center bg-muted/30 rounded-lg border border-dashed">
                        <CreditCard className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">No paid events yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Payment gateway (Stripe/Razorpay) integration is planned for Phase 6.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
