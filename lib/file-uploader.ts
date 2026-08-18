import { uploadFileAction } from "@/domain/file-uploads";
import type { UploadResult } from "@/lib/types";
import type { UploadPurpose } from "@/domain/file-uploads";

export type { UploadResult };

/**
 * Client-side helper for uploading one or more files.
 *
 * Calls the `uploadFileAction` Server Action directly — no HTTP round-trip.
 * Handles the client→server boundary transparently.
 *
 * @param files   - Files to upload (only the first is sent per call)
 * @param purpose - UploadPurpose enum ("PROFILE_AVATAR" | "EVENT_IMAGE" | "ORG_LOGO" | "ORG_KYB_DOCUMENT") or legacy folder
 */
export const handleUpload = async (
    files: File[],
    purpose: UploadPurpose | string = "EVENT_IMAGE",
    options: { imagePreset?: "avatar"; orgId?: string } = {}
): Promise<UploadResult | null> => {
    if (files.length === 0) return null;

    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("purpose", purpose);
    formData.append("folder", purpose); // Backward compatibility
    if (options.imagePreset) {
        formData.append("imagePreset", options.imagePreset);
    }
    if (options.orgId) {
        formData.append("orgId", options.orgId);
    }

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
 * @param file    - File object to upload
 * @param purpose - UploadPurpose enum or legacy folder path
 * @param options - Optional publicId or orgId override
 */
export async function uploadToCloudinary(
    file: File,
    purpose: UploadPurpose | string,
    options: { publicId?: string; orgId?: string } = {}
): Promise<UploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", purpose);
    formData.append("folder", purpose);
    if (options.publicId) {
        formData.append("publicId", options.publicId);
    }
    if (options.orgId) {
        formData.append("orgId", options.orgId);
    }

    const result = await uploadFileAction(formData);

    if (!result.success) {
        throw new Error(result.message ?? "Upload failed");
    }

    return result;
}
