import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getGroupById, getGroupFeed, getGroupEvents, getGroupMembers } from "@/data/groups";
import { prisma } from "@/lib/db";
import GroupFeed from "@/components/groups/GroupFeed";
import GroupCalendar from "@/components/groups/GroupCalendar";
import GroupMembers from "@/components/groups/GroupMembers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import JoinLeaveGroupButton from "@/components/groups/JoinLeaveGroupButton";

export const metadata = {
    title: "Group Details | Evently",
};

export default async function GroupDetailsPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const session = await auth();
    if (!session?.user) redirect("/auth/login");

    const userId = session?.user?.id;
    if (!userId) redirect("/auth/login");

    const orgId = session.user.activeOrganizationId;

    if (!orgId) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
                <h2 className="text-2xl font-semibold mb-2">Active Organization Required</h2>
                <p className="text-muted-foreground">
                    You need an active organization to view group details.
                </p>
            </div>
        );
    }

    const { id } = await params;

    // Fetch group details along with the membership status of the active organization
    const group = await getGroupById(id, orgId);

    if (!group) {
        return (
            <div className="container mx-auto py-12 text-center">
                <h2 className="text-2xl font-bold">Group not found</h2>
                <Link href="/groups" className="text-primary hover:underline mt-4 inline-block">
                    Return to Groups
                </Link>
            </div>
        );
    }

    const isMember = group.members && group.members.length > 0;

    // Fetch members to check admin role
    const myOrgProfile = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } }
    });
    const isAdmin = myOrgProfile?.role === "OWNER" || myOrgProfile?.role === "ADMIN";

    // If member, fetch feed, events, and all members
    const [feed, events, allMembers] = isMember
        ? await Promise.all([
            getGroupFeed(id, orgId),
            getGroupEvents(id, orgId),
            getGroupMembers(id)
        ])
        : [[], [], []];

    return (
        <div className="container mx-auto max-w-5xl py-8 space-y-8">
            <Link href="/groups" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Groups
            </Link>

            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center bg-card p-6 rounded-lg border">
                <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {group.logo ? (
                        <img src={group.logo} alt={group.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                        <Building2 className="w-10 h-10 text-primary" />
                    )}
                </div>

                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
                        <Badge variant="secondary">{group.industry.label}</Badge>
                    </div>
                    <p className="text-muted-foreground max-w-3xl">
                        {group.description || "No description provided."}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                        <span>{group._count.members} Members</span>
                        <span>•</span>
                        <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="shrink-0 flex flex-col gap-2">
                    <JoinLeaveGroupButton
                        groupId={group.id}
                        isMember={isMember}
                        isAdmin={isAdmin}
                    />
                </div>
            </div>

            {!isMember ? (
                <div className="text-center p-12 bg-muted/30 rounded-lg border border-dashed">
                    <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-medium">Join this group to see more</h3>
                    <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                        This is an exclusive consortium for the {group.industry.label} industry.
                        Join to participate in the feed, share events, and connect with other members.
                    </p>
                </div>
            ) : (
                <Tabs defaultValue="feed" className="w-full">
                    <TabsList className="mb-6 w-full justify-start border-b rounded-none px-0 h-auto gap-6 bg-transparent">
                        <TabsTrigger
                            value="feed"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
                        >
                            Group Feed
                        </TabsTrigger>
                        <TabsTrigger
                            value="calendar"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
                        >
                            Shared Calendar
                        </TabsTrigger>
                        <TabsTrigger
                            value="members"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
                        >
                            Members
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="feed" className="mt-0">
                        <GroupFeed groupId={group.id} initialPosts={feed} />
                    </TabsContent>

                    <TabsContent value="calendar" className="mt-0">
                        <GroupCalendar groupId={group.id} initialEvents={events} />
                    </TabsContent>

                    <TabsContent value="members" className="mt-0">
                        <GroupMembers members={allMembers} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
