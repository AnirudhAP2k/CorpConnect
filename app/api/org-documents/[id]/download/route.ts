import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import cloudinary from "@/lib/cloudinary";

/**
 * GET /api/org-documents/[id]/download
 *
 * Authenticated download endpoint for KYB documents.
 * Verifies org membership (OWNER/ADMIN) and malware scan status (APPROVED).
 * Redirects (302) to a short-lived signed Cloudinary URL.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = getApiAuth(req);
    if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: docId } = await params;
    if (!docId) {
        return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    try {
        const doc = await prisma.orgDocument.findUnique({
            where: { id: docId },
            include: {
                uploadAsset: true,
            },
        });

        if (!doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        // Verify org membership if organizationId is set
        if (doc.organizationId) {
            const member = await prisma.organizationMember.findFirst({
                where: { organizationId: doc.organizationId, userId: user.id },
                select: { role: true },
            });

            if (!user.isAppAdmin && (!member || !["OWNER", "ADMIN"].includes(member.role))) {
                return NextResponse.json(
                    { error: "Forbidden — OWNER or ADMIN role required" },
                    { status: 403 }
                );
            }
        }

        // Check scan status if uploadAsset exists and malware scan is actively configured
        if (doc.uploadAsset) {
            if (doc.uploadAsset.scanStatus === "REJECTED") {
                return NextResponse.json(
                    { error: "Document download blocked — malware detected", scanStatus: "REJECTED" },
                    { status: 403 }
                );
            }
            if (doc.uploadAsset.scanStatus === "PENDING" && process.env.CLAMAV_HOST) {
                return NextResponse.json(
                    { error: "Document malware scan is still pending", scanStatus: "PENDING" },
                    { status: 403 }
                );
            }
        }

        // Resolve public_id to generate signed URL
        const publicId = doc.uploadAsset?.cloudinaryPublicId;
        let downloadUrl = doc.sourceUrl;

        if (publicId) {
            const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60; // 5 minute signature
            downloadUrl = cloudinary.url(publicId, {
                resource_type: "raw",
                type: "authenticated",
                flags: "attachment",
                sign_url: true,
                expires_at: expiresAt,
                secure: true,
            });
        }

        if (!downloadUrl) {
            return NextResponse.json(
                { error: "No download URL available for this document" },
                { status: 404 }
            );
        }

        // Check if caller wants JSON vs direct redirect (e.g. ?format=json)
        const format = req.nextUrl.searchParams.get("format");
        if (format === "json") {
            return NextResponse.json({ url: downloadUrl, expiresAt: Math.floor(Date.now() / 1000) + 300 });
        }

        return NextResponse.redirect(downloadUrl, 302);
    } catch (err: any) {
        console.error("[org-documents/download] Error:", err?.message ?? err);
        return NextResponse.json({ error: "Download failed" }, { status: 500 });
    }
}
