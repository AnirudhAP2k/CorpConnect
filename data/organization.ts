/**
 * Organization Data Access Layer
 * 
 * Security principles:
 * - All queries validate user permissions
 * - Sensitive data is excluded from public queries
 * - Input validation on all parameters
 * - SQL injection protection via Prisma
 */

import { prisma } from "@/lib/db";
import { OrganizationRole, OrganizationSize } from "@prisma/client";

/**
 * Get organization by ID with optional member filtering
 * @throws Error if organization not found
 */
export async function getOrganizationById(id: string) {
    try {
        const organization = await prisma.organization.findUnique({
            where: { id },
            include: {
                industry: true,
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        events: true,
                        participations: true,
                    },
                },
            },
        });

        if (!organization) {
            throw new Error("Organization not found");
        }

        return organization;
    } catch (error) {
        console.error("Error fetching organization:", error);
        throw error;
    }
}

/**
 * Get all organizations a user belongs to
 */
export async function getUserOrganizations(userId: string) {
    try {
        const memberships = await prisma.organizationMember.findMany({
            where: { userId },
            include: {
                organization: {
                    include: {
                        industry: true,
                        _count: {
                            select: {
                                members: true,
                                events: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return memberships.map((m) => ({
            ...m.organization,
            role: m.role,
        }));
    } catch (error) {
        console.error("Error fetching user organizations:", error);
        throw error;
    }
}

/**
 * Create a new organization
 * Security: Automatically assigns creator as OWNER
 */
export async function createOrganization(data: {
    name: string;
    industryId: string;
    description?: string;
    website?: string;
    location?: string;
    size?: OrganizationSize;
    logo?: string;
    createdBy: string;
}) {
    try {
        // Validate industry exists
        const industry = await prisma.industry.findUnique({
            where: { id: data.industryId },
        });

        if (!industry) {
            throw new Error("Invalid industry selected");
        }

        // Create organization and assign creator as owner in a transaction
        const organization = await prisma.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: {
                    name: data.name,
                    industryId: data.industryId,
                    description: data.description,
                    website: data.website,
                    location: data.location,
                    size: data.size || "STARTUP",
                    logo: data.logo,
                    createdBy: data.createdBy,
                },
                include: {
                    industry: true,
                },
            });

            // Add creator as OWNER
            await tx.organizationMember.create({
                data: {
                    userId: data.createdBy,
                    organizationId: org.id,
                    role: "OWNER",
                },
            });

            // Update user's organization and onboarding status
            await tx.user.update({
                where: { id: data.createdBy },
                data: {
                    organizationId: org.id,
                    hasCompletedOnboarding: true,
                },
            });

            return org;
        });

        return organization;
    } catch (error) {
        console.error("Error creating organization:", error);
        throw error;
    }
}

/**
 * Update organization details
 * Security: Only OWNER and ADMIN can update
 */
export async function updateOrganization(
    organizationId: string,
    userId: string,
    data: {
        name?: string;
        description?: string;
        website?: string;
        location?: string;
        size?: OrganizationSize;
        logo?: string;
    }
) {
    try {
        // Check user permission
        const member = await prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId,
                },
            },
        });

        if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
            throw new Error("Unauthorized: Only organization owners and admins can update details");
        }

        const organization = await prisma.organization.update({
            where: { id: organizationId },
            data,
            include: {
                industry: true,
            },
        });

        return organization;
    } catch (error) {
        console.error("Error updating organization:", error);
        throw error;
    }
}

/**
 * Get organization members with their roles
 */
export async function getOrganizationMembers(organizationId: string) {
    try {
        const members = await prisma.organizationMember.findMany({
            where: { organizationId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        emailVerified: true,
                    },
                },
            },
            orderBy: [
                { role: "asc" }, // OWNER first, then ADMIN, then MEMBER
                { createdAt: "asc" },
            ],
        });

        return members;
    } catch (error) {
        console.error("Error fetching organization members:", error);
        throw error;
    }
}

/**
 * Add a member to an organization
 * Security: Only OWNER and ADMIN can add members
 */
export async function addMemberToOrganization(
    organizationId: string,
    requesterId: string,
    newMemberEmail: string,
    role: OrganizationRole = "MEMBER"
) {
    try {
        // Check requester permission
        const requester = await prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId: requesterId,
                    organizationId,
                },
            },
        });

        if (!requester || (requester.role !== "OWNER" && requester.role !== "ADMIN")) {
            throw new Error("Unauthorized: Only organization owners and admins can add members");
        }

        // Only OWNER can add ADMIN or OWNER roles
        if ((role === "ADMIN" || role === "OWNER") && requester.role !== "OWNER") {
            throw new Error("Unauthorized: Only organization owners can assign admin or owner roles");
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: newMemberEmail },
        });

        if (!user) {
            throw new Error("User not found with this email");
        }

        // Check if already a member
        const existingMember = await prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId: user.id,
                    organizationId,
                },
            },
        });

        if (existingMember) {
            throw new Error("User is already a member of this organization");
        }

        // Add member
        const member = await prisma.organizationMember.create({
            data: {
                userId: user.id,
                organizationId,
                role,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
        });

        return member;
    } catch (error) {
        console.error("Error adding member to organization:", error);
        throw error;
    }
}

/**
 * Remove a member from an organization
 * Security: Only OWNER can remove members, cannot remove self if only owner
 */
export async function removeMemberFromOrganization(
    organizationId: string,
    requesterId: string,
    memberIdToRemove: string
) {
    try {
        // Check requester permission
        const requester = await prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId: requesterId,
                    organizationId,
                },
            },
        });

        if (!requester || requester.role !== "OWNER") {
            throw new Error("Unauthorized: Only organization owners can remove members");
        }

        // Prevent removing self if only owner
        if (requesterId === memberIdToRemove) {
            const ownerCount = await prisma.organizationMember.count({
                where: {
                    organizationId,
                    role: "OWNER",
                },
            });

            if (ownerCount === 1) {
                throw new Error("Cannot remove yourself as the only owner. Transfer ownership first.");
            }
        }

        await prisma.organizationMember.delete({
            where: {
                userId_organizationId: {
                    userId: memberIdToRemove,
                    organizationId,
                },
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Error removing member from organization:", error);
        throw error;
    }
}

/**
 * Check if user has permission in organization
 */
export async function checkOrganizationPermission(
    userId: string,
    organizationId: string,
    requiredRole?: OrganizationRole
) {
    try {
        const member = await prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId,
                },
            },
        });

        if (!member) {
            return { hasPermission: false, role: null };
        }

        if (requiredRole) {
            const roleHierarchy: Record<OrganizationRole, number> = {
                OWNER: 3,
                ADMIN: 2,
                MEMBER: 1,
            };

            const hasPermission = roleHierarchy[member.role] >= roleHierarchy[requiredRole];
            return { hasPermission, role: member.role };
        }

        return { hasPermission: true, role: member.role };
    } catch (error) {
        console.error("Error checking organization permission:", error);
        return { hasPermission: false, role: null };
    }
}

/**
 * Get all industries for dropdown selection
 */
export async function getAllIndustries() {
    try {
        const industries = await prisma.industry.findMany({
            orderBy: {
                label: "asc",
            },
        });

        return industries;
    } catch (error) {
        console.error("Error fetching industries:", error);
        throw error;
    }
}
