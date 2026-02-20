import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { getAdminUsersList } from "@/data/dashboard";
import { format } from "date-fns";
import Link from "next/link";

interface AdminUsersPageProps {
    searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
    const { search, page } = await searchParams;
    const pageNum = parseInt(page ?? "1", 10);
    const take = 20;
    const skip = (pageNum - 1) * take;

    const { users, total } = await getAdminUsersList(skip, take, search);
    const totalPages = Math.ceil(total / take);

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Users</h1>
                    <p className="text-muted-foreground text-sm mt-1">{total.toLocaleString()} registered users</p>
                </div>
                <form method="get" className="flex gap-2">
                    <input
                        name="search"
                        type="text"
                        defaultValue={search}
                        placeholder="Search by name or email..."
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
                    />
                    <button type="submit" className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                        Search
                    </button>
                </form>
            </div>

            <Card>
                <CardContent className="p-0">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                        <div className="col-span-4">User</div>
                        <div className="col-span-3">Organization</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2">Role</div>
                        <div className="col-span-1 text-right">Joined</div>
                    </div>
                    <div className="divide-y divide-muted/50">
                        {users.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Users className="h-12 w-12 text-muted-foreground mb-3" />
                                <p className="font-medium">No users found</p>
                            </div>
                        ) : users.map((user) => (
                            <div key={user.id} className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-muted/20 transition-colors items-center">
                                {/* User */}
                                <div className="col-span-4 flex items-center gap-3 min-w-0">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex-shrink-0 overflow-hidden">
                                        {user.image ? (
                                            <img src={user.image} alt={user.name ?? ""} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-xs font-bold text-primary">
                                                {user.name?.[0]?.toUpperCase() ?? "?"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium text-sm truncate">{user.name ?? "—"}</div>
                                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                    </div>
                                </div>
                                {/* Org */}
                                <div className="col-span-3 text-sm truncate">
                                    {user.organization ? (
                                        <Link href={`/organizations/${user.organization.id}`} className="hover:text-primary transition-colors">
                                            {user.organization.name}
                                        </Link>
                                    ) : (
                                        <span className="text-muted-foreground">None</span>
                                    )}
                                </div>
                                {/* Status */}
                                <div className="col-span-2">
                                    <Badge
                                        variant="outline"
                                        className={user.hasCompletedOnboarding
                                            ? "bg-green-50 text-green-700 border-green-300 text-[10px]"
                                            : "bg-yellow-50 text-yellow-700 border-yellow-300 text-[10px]"
                                        }
                                    >
                                        {user.hasCompletedOnboarding ? "Active" : "Onboarding"}
                                    </Badge>
                                </div>
                                {/* Role */}
                                <div className="col-span-2">
                                    {user.isAppAdmin ? (
                                        <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">App Admin</Badge>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">User</span>
                                    )}
                                </div>
                                {/* Joined */}
                                <div className="col-span-1 text-right text-xs text-muted-foreground">
                                    {format(new Date(user.createdAt), "MMM d")}
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
