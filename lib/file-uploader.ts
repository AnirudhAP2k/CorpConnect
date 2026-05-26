import { uploadFileAction } from "@/actions/upload.actions";
import type { UploadResult } from "@/lib/types";

export type { UploadResult };

/**
 * Client-side helper for uploading one or more files.
 *
 * Calls the `uploadFileAction` Server Action directly — no HTTP round-trip.
 * Next.js handles the client→server boundary transparently.
 *
 * @param files  - Files to upload (only the first is sent per call)
 * @param folder - Cloud storage destination folder (default: "uploads")
 */
export const handleUpload = async (
    files: File[],
    folder = "uploads"
): Promise<UploadResult | null> => {
    if (files.length === 0) return null;

    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("folder", folder);

    try {
        const result = await uploadFileAction(formData);
        if (!result.success) {
            console.error("[handleUpload] Upload failed:", result.message);
            return null;
        }
        return result;
    } catch (error: any) {
        console.error("[handleUpload] Unexpected error:", error?.message ?? error);
        return null;
    }
};

/**
 * Server-side interface for uploading a file to cloud storage.
 *
 * Calls `uploadFileAction` as a plain function — zero HTTP overhead.
 * To migrate to S3 in the future, update `uploadFileAction` only.
 *
 * @param file    - File object to upload
 * @param folder  - Cloud storage folder path (e.g. "org-documents/abc123")
 * @param options - Optional publicId override
 * @throws        - If the upload fails
 */
export async function uploadToCloudinary(
    file: File,
    folder: string,
    options: { publicId?: string } = {}
): Promise<UploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    if (options.publicId) {
        formData.append("publicId", options.publicId);
    }

    const result = await uploadFileAction(formData);

    if (!result.success) {
        throw new Error(result.message ?? "Upload failed");
    }

    return result;
}