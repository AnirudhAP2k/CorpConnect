import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import cloudinary from "@/lib/cloudinary";

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

const ALLOWED_MIME = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

const KYB_DOC_TYPES = new Set([
    "INCORPORATION_CERT",
    "TAX_CERTIFICATE",
    "ADDRESS_PROOF",
    "OTHER_KYB",
    "LEGAL_COMPLIANCE",
    "COMPANY_DESCRIPTION",
    "EVENT_DESCRIPTION",
    "GENERAL",
]);

export async function POST(req: NextRequest) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const orgId = formData.get("orgId") as string | null;
        const docType = formData.get("docType") as string | null;
        const title = formData.get("title") as string | null;
        const taxRefNumber = formData.get("taxRefNumber") as string | null;

        // ── Validate ─────────────────────────────────────────────────────────
        if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
        if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });
        if (!docType || !KYB_DOC_TYPES.has(docType))
            return NextResponse.json({ error: `Invalid docType: ${docType}` }, { status: 400 });
        if (!title?.trim())
            return NextResponse.json({ error: "title is required" }, { status: 400 });
        if (!ALLOWED_MIME.has(file.type))
            return NextResponse.json({ error: "Only PDF and image files are allowed" }, { status: 400 });

        const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
        if (file.size > MAX_BYTES)
            return NextResponse.json({ error: "File size must be under 10 MB" }, { status: 400 });

        // ── Verify org membership ─────────────────────────────────────────────
        const member = await prisma.organizationMember.findFirst({
            where: { organizationId: orgId, userId },
            select: { role: true },
        });
        if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
            return NextResponse.json({ error: "Forbidden — OWNER or ADMIN role required" }, { status: 403 });
        }

        // ── Upload to Cloudinary (raw accepts PDFs & images) ──────────────────
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadResult: any = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: `org-documents/${orgId}`,
                    resource_type: "raw",      // allows PDFs and all file types
                    public_id: `${docType}_${Date.now()}`,
                    use_filename: false,
                },
                (err: any, result: any) => {
                    if (err) reject(err);
                    else resolve(result);
                }
            ).end(buffer);
        });

        const sourceUrl: string = uploadResult.secure_url;

        // ── Create OrgDocument row ────────────────────────────────────────────
        const doc = await prisma.orgDocument.create({
            data: {
                organizationId: orgId,
                docType: docType as any,
                title: title.trim(),
                content: `[KYB Document] ${title.trim()}${taxRefNumber ? ` — Ref: ${taxRefNumber}` : ""}. Uploaded for verification.`,
                sourceUrl,
                taxRefNumber: taxRefNumber?.trim() || null,
            },
        });

        return NextResponse.json({ docId: doc.id, sourceUrl }, { status: 201 });
    } catch (err: any) {
        console.error("[org-documents/upload] Error:", err);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}

/**
 * GET /api/org-documents/upload?orgId=...
 * Returns the list of KYB documents uploaded for an org.
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = req.nextUrl.searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

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
            sourceUrl: true,
            createdAt: true,
        },
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(docs);
}
