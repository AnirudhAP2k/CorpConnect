import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

// Validation schema for adding member
const AddMemberSchema = z.object({
    email: z.string().email(),
    role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

// POST /api/organizations/[id]/members - Invite member to organization
export const POST = async (
    req: NextRequest,
    { params }: { params: { id: string } }
) => {
    try {
        const organizationId = params.id;
        const data = await req.json();

        const validated = AddMemberSchema.safeParse(data);

        if (!validated.success) {
            return NextResponse.json(
                { error: "Invalid data", details: validated.error.errors },
                { status: 400 }
            );
        }

        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if requester is OWNER or ADMIN
        const requesterMembership = await prisma.organizationMember.findFirst({
            where: {
                organizationId,
                userId,
                role: {
                    in: ["OWNER", "ADMIN"],
                },
            },
        });

        if (!requesterMembership) {
            return NextResponse.json(
                { error: "You don't have permission to invite members" },
                { status: 403 }
            );
        }

        // Find user by email
        const userToInvite = await prisma.user.findUnique({
            where: { email: validated.data.email },
        });

        if (!userToInvite) {
            return NextResponse.json(
                {
                    error: "User not found. Please ask them to register first.",
                },
                { status: 404 }
            );
        }

        // Check if user is already a member
        const existingMembership = await prisma.organizationMember.findFirst({
            where: {
                organizationId,
                userId: userToInvite.id,
            },
        });

        if (existingMembership) {
            return NextResponse.json(
                { error: "User is already a member of this organization" },
                { status: 400 }
            );
        }

        // Check if user belongs to another organization (one org per user rule)
        const userOrgMembership = await prisma.organizationMember.findFirst({
            where: {
                userId: userToInvite.id,
            },
        });

        if (userOrgMembership) {
            return NextResponse.json(
                {
                    error:
                        "User already belongs to another organization. Users can only belong to one organization at a time.",
                },
                { status: 400 }
            );
        }

        // Check if there's already a pending invite for this email
        const existingInvite = await prisma.pendingInvite.findFirst({
            where: {
                organizationId,
                email: validated.data.email,
                status: {
                    in: ["PENDING", "SENT"],
                },
            },
        });

        if (existingInvite) {
            return NextResponse.json(
                { error: "An invitation has already been sent to this email" },
                { status: 400 }
            );
        }

        // Generate unique token for invite
        const token = crypto.randomBytes(32).toString("hex");

        // Set expiration to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create pending invite (email will be sent by scheduler)
        const invite = await prisma.pendingInvite.create({
            data: {
                organizationId,
                email: validated.data.email,
                role: validated.data.role,
                invitedBy: userId,
                token,
                expiresAt,
            },
        });

        return NextResponse.json(
            {
                message: "Invitation created successfully. An email will be sent shortly.",
                inviteId: invite.id,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Invite member error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};
