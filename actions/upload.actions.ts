"use server";

import cloudinary from "@/lib/cloudinary";
import type { UploadResult } from "@/lib/types";

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** MIME types that Cloudinary should receive as the "image" resource_type. */
const IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/avif",
]);

/**
 * Derives the Cloudinary resource_type from the file's MIME type so callers
 * don't need to think about it.
 */
function resolveResourceType(mimeType: string): "image" | "raw" | "auto" {
    if (IMAGE_MIME_TYPES.has(mimeType)) return "image";
    if (mimeType.startsWith("video/")) return "auto";
    return "raw"; // PDFs, spreadsheets, docs, etc.
}

const MAX_FILE_SIZE = process.env.MAX_UPLOAD_SIZE
    ? Number.parseInt(process.env.MAX_UPLOAD_SIZE)
    : 10 * 1024 * 1024; // 10 MB

/**
 * Uploads a file to cloud.
 *
 * Accepts a `FormData` with:
 *   - `file`     {File}   — the file to upload (required)
 *   - `folder`   {string} — destination folder in cloud (default: "uploads")
 *   - `publicId` {string} — optional custom public_id
 *
 * Called directly from client components (Next.js handles the server boundary)
 * and from server-side helpers like `uploadToCloudinary`. The `/api/file-upload`
 * route is a thin HTTP wrapper around this action, kept only for mobile clients.
 *
 * To migrate to S3: replace the Cloudinary logic inside this function only —
 * all callers remain unchanged.
 */
export async function uploadFileAction(formData: FormData): Promise<UploadResult> {
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string | null) ?? "uploads";
    const publicId = (formData.get("publicId") as string | null) ?? undefined;

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!file || typeof file === "string") {
        return { success: false, publicId: null, url: null, imageUrl: null, message: "No file provided" };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            success: false,
            publicId: null,
            url: null,
            imageUrl: null,
            message: `File too large (max ${MAX_FILE_SIZE / (1024 * 1024)}MB)`,
        };
    }

    // ── Upload ────────────────────────────────────────────────────────────────
    try {
        const resourceType = resolveResourceType(file.type);
        const buffer = Buffer.from(await file.arrayBuffer());

        const raw = await new Promise<any>((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder, resource_type: resourceType, public_id: publicId, use_filename: false },
                (err: any, result: any) => {
                    if (err) reject(err);
                    else resolve(result);
                }
            ).end(buffer);
        });

        const url: string = raw.secure_url ?? null;

        return {
            success: true,
            publicId: raw.public_id ?? null,
            url,
            imageUrl: url,
        };
    } catch (error: any) {
        console.error("[uploadFileAction] Cloudinary error:", error?.message ?? error);
        return { success: false, publicId: null, url: null, imageUrl: null, message: "Upload failed" };
    }
}
