import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    trend?: {
        value: number; // positive = up, negative = down
        label: string; // e.g. "vs last month"
    };
    className?: string;
    iconClassName?: string;
}

export default function StatCard({
    title,
    value,
    description,
    icon: Icon,
    trend,
    className,
    iconClassName,
}: StatCardProps) {
    return (
        <Card className={cn("relative overflow-hidden", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className={cn(
                    "p-2 rounded-xl",
                    iconClassName ?? "bg-primary/10"
                )}>
                    <Icon className="h-4 w-4 text-primary" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs mt-2 font-medium",
                        trend.value >= 0 ? "text-green-600" : "text-red-500"
                    )}>
                        <span>{trend.value >= 0 ? "↑" : "↓"}</span>
                        <span>{Math.abs(trend.value)}% {trend.label}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
