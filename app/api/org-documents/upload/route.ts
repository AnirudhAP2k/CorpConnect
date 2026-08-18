import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { uploadToCloudinary } from "@/lib/file-uploader";
import { orgDocumentUploadSchema } from "@/domain/organizations/validation";

/**
 * POST /api/org-documents/upload
 *
 * Accepts a multipart form with:
 *   - file         File (PDF, image — max 10MB)
 *   - orgId        UUID of the organization
 *   - docType      OrgDocumentType enum value
 *   - title        Human-readable label
 *   - taxRefNumber Optional linked identifier (GSTIN, CIN, EIN…)
 *
 * Uploads to Cloudinary (resource_type: "raw" — supports PDFs + images).
 * Creates an OrgDocument row with the resulting URL.
 * Returns { docId, sourceUrl }.
 */

export async function POST(req: NextRequest) {
    const user = getApiAuth(req);
    const userId = user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        // ── Validate file presence first (File can't go through Zod) ─────────
        if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

        const MAX_BYTES = parseInt(process.env.FILE_UPLOAD_MAX_BYTES as string) || 10 * 1024 * 1024;
        if (file.size > MAX_BYTES)
            return NextResponse.json({ error: `File size must be under ${MAX_BYTES / (1024 * 1024)}MB` }, { status: 400 });

        // ── Validate remaining fields via schema ──────────────────────────────
        const parsed = orgDocumentUploadSchema.safeParse({
            orgId: formData.get("orgId"),
            docType: formData.get("docType"),
            title: formData.get("title"),
            taxRefNumber: formData.get("taxRefNumber") || undefined,
            mimeType: file.type,
        });

        if (!parsed.success) {
            const message = parsed.error.errors[0]?.message ?? "Invalid request";
            return NextResponse.json({ error: message }, { status: 400 });
        }

        const { orgId, docType, title, taxRefNumber } = parsed.data;

        // ── Verify org membership ─────────────────────────────────────────────
        const member = await prisma.organizationMember.findFirst({
            where: { organizationId: orgId, userId },
            select: { role: true },
        });
        if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
            return NextResponse.json({ error: "Forbidden — OWNER or ADMIN role required" }, { status: 403 });
        }

        const uploadResult = await uploadToCloudinary(file, "ORG_KYB_DOCUMENT", {
            orgId,
            publicId: `${docType}_${Date.now()}`,
        });

        if (!uploadResult.url) {
            return NextResponse.json({ error: "Upload succeeded but no URL was returned" }, { status: 500 });
        }

        const sourceUrl: string = uploadResult.url;

        const doc = await prisma.orgDocument.create({
            data: {
                organizationId: orgId,
                docType: docType as any,
                title: title.trim(),
                content: `[KYB Document] ${title.trim()}${taxRefNumber ? ` — Ref: ${taxRefNumber}` : ""}. Uploaded for verification.`,
                sourceUrl: null, // P3 Gated: Do not store permanent public URL directly for sensitive KYB docs
                taxRefNumber: taxRefNumber?.trim() || null,
            },
        });

        if (uploadResult.uploadAssetId) {
            await prisma.uploadAsset.update({
                where: { id: uploadResult.uploadAssetId },
                data: { orgDocumentId: doc.id },
            });
        }

        return NextResponse.json(
            {
                docId: doc.id,
                scanStatus: uploadResult.scanStatus ?? "PENDING",
                downloadUrl: `/api/org-documents/${doc.id}/download`,
            },
            { status: 201 }
        );
    } catch (err: any) {
        console.error("[org-documents/upload] Error:", err);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}

/**
 * GET /api/org-documents/upload?orgId=...
 * Returns the list of KYB documents uploaded for an org (without raw sourceUrls).
 */
export async function GET(req: NextRequest) {
    const user = getApiAuth(req);
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = req.nextUrl.searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    // ── Verify org membership — KYB documents are sensitive, OWNER/ADMIN only ──
    const member = await prisma.organizationMember.findFirst({
        where: { organizationId: orgId, userId: user.id },
        select: { role: true },
    });
    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
        return NextResponse.json({ error: "Forbidden — OWNER or ADMIN role required" }, { status: 403 });
    }

    const docs = await prisma.orgDocument.findMany({
        where: {
            organizationId: orgId,
            docType: { in: ["INCORPORATION_CERT", "TAX_CERTIFICATE", "ADDRESS_PROOF", "OTHER_KYB", "LEGAL_COMPLIANCE"] as any[] },
        },
        select: {
            id: true,
            docType: true,
            title: true,
            taxRefNumber: true,
            createdAt: true,
            uploadAsset: {
                select: {
                    scanStatus: true,
                },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    const formattedDocs = docs.map((doc: any) => ({
        id: doc.id,
        docType: doc.docType,
        title: doc.title,
        taxRefNumber: doc.taxRefNumber,
        createdAt: doc.createdAt,
        scanStatus: doc.uploadAsset?.scanStatus ?? "APPROVED",
        downloadUrl: `/api/org-documents/${doc.id}/download`,
    }));

    return NextResponse.json(formattedDocs);
}
