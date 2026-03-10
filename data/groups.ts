import { prisma } from "@/lib/db";
import { OrganizationRole } from "@prisma/client";

export async function getGroups(orgId: string, industryId?: string) {
    if (!orgId) return { myGroups: [], discoverGroups: [] };

    try {
        const allGroups = await prisma.industryGroup.findMany({
            include: {
                industry: true,
                _count: {
                    select: { members: true },
                },
                members: {
                    where: { organizationId: orgId }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const myGroups = allGroups.filter(g => g.members.length > 0);
        const discoverGroups = allGroups.filter(g => g.members.length === 0);

        return { myGroups, discoverGroups };
    } catch (error) {
        console.error("[getGroups]", error);
        return { myGroups: [], discoverGroups: [] };
    }
}

export async function getGroupById(groupId: string, orgId?: string) {
    try {
        const group = await prisma.industryGroup.findUnique({
            where: { id: groupId },
            include: {
                industry: true,
                _count: {
                    select: { members: true, posts: true, events: true },
                },
                members: orgId ? {
                    where: { organizationId: orgId }
                } : false,
            }
        });

        return group;
    } catch (error) {
        console.error("[getGroupById]", error);
        return null;
    }
}

export async function getGroupFeed(groupId: string, orgId: string) {
    try {
        // First verify membership
        const member = await prisma.industryGroupMember.findUnique({
            where: {
                groupId_organizationId: {
                    groupId,
                    organizationId: orgId
                }
            }
        });

        if (!member) {
            return []; // Not a member, no feed access
        }

        const posts = await prisma.groupPost.findMany({
            where: { groupId },
            include: {
                authorOrg: {
                    select: { id: true, name: true, logo: true }
                },
                authorUser: {
                    select: { id: true, name: true, image: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return posts;
    } catch (error) {
        console.error("[getGroupFeed]", error);
        return [];
    }
}

export async function getGroupEvents(groupId: string, orgId: string) {
    try {
        // Verify membership
        const member = await prisma.industryGroupMember.findUnique({
            where: {
                groupId_organizationId: {
                    groupId,
                    organizationId: orgId
                }
            }
        });

        if (!member) {
            return [];
        }

        const groupEvents = await prisma.industryGroupEvent.findMany({
            where: { groupId },
            include: {
                event: {
                    include: {
                        category: true,
                        organization: { select: { id: true, name: true, logo: true } }
                    }
                },
                addedByOrg: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { event: { startDateTime: 'asc' } }
        });

        return groupEvents;
    } catch (error) {
        console.error("[getGroupEvents]", error);
        return [];
    }
}

export async function getGroupMembers(groupId: string) {
    try {
        const members = await prisma.industryGroupMember.findMany({
            where: { groupId },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        location: true,
                        industry: true
                    }
                }
            },
            orderBy: { joinedAt: 'desc' }
        });

        return members;
    } catch (error) {
        console.error("[getGroupMembers]", error);
        return [];
    }
}
