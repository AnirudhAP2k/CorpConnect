import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Calendar } from "lucide-react";
import { getAdminOrgsList } from "@/data/dashboard";
import { format } from "date-fns";
import Link from "next/link";

interface AdminOrgsPageProps {
    searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function AdminOrgsPage({ searchParams }: AdminOrgsPageProps) {
    const { search, page } = await searchParams;
    const pageNum = parseInt(page ?? "1", 10);
    const take = 20;
    const skip = (pageNum - 1) * take;

    const { orgs, total } = await getAdminOrgsList(skip, take, search);
    const totalPages = Math.ceil(total / take);

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Organizations</h1>
                    <p className="text-muted-foreground text-sm mt-1">{total.toLocaleString()} organizations on the platform</p>
                </div>
                <form method="get" className="flex gap-2">
                    <input
                        name="search"
                        type="text"
                        defaultValue={search}
                        placeholder="Search organizations..."
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button type="submit" className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                        Search
                    </button>
                </form>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="divide-y divide-muted/50">
                        {orgs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Building2 className="h-12 w-12 text-muted-foreground mb-3" />
                                <p className="font-medium">No organizations found</p>
                            </div>
                        ) : orgs.map((org) => (
                            <div key={org.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {org.logo ? (
                                        <img src={org.logo} alt={org.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <Building2 className="h-5 w-5 text-primary" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Link href={`/organizations/${org.id}`} className="font-medium hover:text-primary transition-colors">
                                            {org.name}
                                        </Link>
                                        {org.isVerified && (
                                            <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">✓ Verified</Badge>
                                        )}
                                        <Badge variant="outline" className="text-[10px]">{org.size}</Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                        <span>{org.industry.label}</span>
                                        {org.location && <span>· {org.location}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm text-muted-foreground flex-shrink-0">
                                    <div className="flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5" />
                                        {org._count.members}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {org._count.events}
                                    </div>
                                    <div className="text-xs">
                                        {format(new Date(org.createdAt), "MMM d, yyyy")}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                        Showing {skip + 1}–{Math.min(skip + take, total)} of {total}
                    </span>
                    <div className="flex gap-2">
                        {pageNum > 1 && (
                            <Link href={`?page=${pageNum - 1}${search ? `&search=${search}` : ""}`}
                                className="px-3 py-1.5 border rounded-lg hover:bg-muted transition-colors">
                                ← Previous
                            </Link>
                        )}
                        {pageNum < totalPages && (
                            <Link href={`?page=${pageNum + 1}${search ? `&search=${search}` : ""}`}
                                className="px-3 py-1.5 border rounded-lg hover:bg-muted transition-colors">
                                Next →
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
