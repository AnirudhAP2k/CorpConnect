"use server";

import cloudinary from "@/lib/cloudinary";
import { prisma } from "@/lib/db";
import type { UploadResult } from "@/lib/types";
import type { UploadPurpose, UploadSecureInput, UploadSecureResult, ScanUploadPayload } from "./types";
import { UPLOAD_POLICIES, isValidUploadPurpose, validateUpload } from "./validation";
import { checkUploadRateLimit } from "./rate-limit";

/**
 * Core domain service for uploading files securely after performing magic-byte content validation,
 * purpose-based policy enforcement, rate limiting, and scan enqueueing.
 */
export async function uploadFileSecure(input: UploadSecureInput): Promise<UploadSecureResult> {
    const { file, purpose, userId, orgId, publicId } = input;

    if (!file || typeof file === "string") {
        return {
            success: false,
            publicId: null,
            url: null,
            imageUrl: null,
            message: "No file provided",
            code: "NO_FILE",
        };
    }

    if (!isValidUploadPurpose(purpose)) {
        return {
            success: false,
            publicId: null,
            url: null,
            imageUrl: null,
            message: `Invalid upload purpose: "${purpose}"`,
            code: "INVALID_PURPOSE",
        };
    }

    // ── Rate Limit Check ──
    if (userId) {
        const rateCheck = await checkUploadRateLimit(userId);
        if (!rateCheck.allowed) {
            return {
                success: false,
                publicId: null,
                url: null,
                imageUrl: null,
                message: rateCheck.message,
                code: "RATE_LIMITED",
            };
        }
    }

    const policy = UPLOAD_POLICIES[purpose];

    try {
        const buffer = Buffer.from(await file.arrayBuffer());

        // ── Content Magic-Byte Validation Gate ──
        const validated = validateUpload(buffer, purpose, file.name, file.type);
        if (!validated.ok) {
            return {
                success: false,
                publicId: null,
                url: null,
                imageUrl: null,
                message: validated.message,
                code: validated.code,
            };
        }

        // ── Resolve Server-Controlled Destination ──
        let destinationFolder = policy.defaultFolder;
        if (purpose === "ORG_KYB_DOCUMENT" && orgId) {
            const cleanOrgId = orgId.replace(/[^a-zA-Z0-9_-]/g, "");
            destinationFolder = `org-documents/${cleanOrgId}`;
        }

        // ── Ensure Public ID retains file extension ──
        let targetPublicId = publicId;
        if (targetPublicId) {
            const ext = `.${validated.detectedExt.toLowerCase()}`;
            if (!targetPublicId.toLowerCase().endsWith(ext)) {
                targetPublicId = `${targetPublicId}${ext}`;
            }
        }

        // ── Cloudinary Upload Stream ──
        const raw = await new Promise<any>((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: destinationFolder,
                    resource_type: policy.resourceType,
                    type: policy.accessType || "upload",
                    public_id: targetPublicId,
                    use_filename: false,
                    ...(policy.imagePreset === "avatar" && {
                        format: "webp",
                        transformation: [
                            {
                                width: 512,
                                height: 512,
                                crop: "limit",
                                quality: "auto:good",
                            },
                        ],
                    }),
                },
                (err: any, result: any) => {
                    if (err) reject(err);
                    else resolve(result);
                }
            ).end(validated.buffer);
        });

        const url: string = raw.secure_url ?? null;

        if (!url) {
            return {
                success: false,
                publicId: null,
                url: null,
                imageUrl: null,
                message: "Cloud upload succeeded but no URL was returned",
            };
        }

        const scanRequired = !!policy.requiresScan;
        const scanStatus = scanRequired ? "PENDING" : "APPROVED";

        // ── Create UploadAsset Record ──
        let uploadAssetId: string | null = null;
        if (userId) {
            const asset = await prisma.uploadAsset.create({
                data: {
                    userId,
                    organizationId: orgId ?? null,
                    purpose: purpose as any,
                    scanStatus: scanStatus as any,
                    detectedMime: validated.detectedMime,
                    sizeBytes: buffer.length,
                    cloudinaryPublicId: raw.public_id,
                    secureUrl: scanRequired ? null : url,
                },
            });
            uploadAssetId = asset.id;

            // ── Enqueue Scan Job for scan-required uploads ──
            if (scanRequired) {
                const scanPayload: ScanUploadPayload = {
                    uploadAssetId: asset.id,
                    cloudinaryPublicId: raw.public_id,
                    purpose,
                    orgId,
                };

                await prisma.jobQueue.create({
                    data: {
                        type: "SCAN_UPLOAD",
                        payload: scanPayload as any,
                        maxAttempts: 3,
                    },
                });

                console.log(`[uploadFileSecure] Enqueued SCAN_UPLOAD for asset ${asset.id}`);
            }
        }

        return {
            success: true,
            publicId: raw.public_id ?? null,
            url,
            imageUrl: url,
            detectedMime: validated.detectedMime,
            detectedExt: validated.detectedExt,
            purpose,
            scanStatus,
            uploadAssetId,
        };
    } catch (error: any) {
        console.error("[uploadFileSecure] Upload gate error:", error?.message ?? error);
        return {
            success: false,
            publicId: null,
            url: null,
            imageUrl: null,
            message: "File upload failed",
        };
    }
}

/**
 * Server Action boundary for client file uploads.
 */
export async function uploadFileAction(formData: FormData): Promise<UploadResult> {
    const { auth } = await import("@/auth");
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, publicId: null, url: null, imageUrl: null, message: "Unauthorized" };
    }

    const file = formData.get("file") as File | null;
    const purposeInput = formData.get("purpose") as string | null;
    const folderInput = formData.get("folder") as string | null;
    const publicId = (formData.get("publicId") as string | null) ?? undefined;
    const imagePreset = formData.get("imagePreset") as string | null;
    const orgId = (formData.get("orgId") as string | null) ?? undefined;

    if (!file || typeof file === "string") {
        return { success: false, publicId: null, url: null, imageUrl: null, message: "No file provided" };
    }

    let purpose: UploadPurpose = "EVENT_IMAGE";
    if (purposeInput && isValidUploadPurpose(purposeInput)) {
        purpose = purposeInput;
    } else if (imagePreset === "avatar") {
        purpose = "PROFILE_AVATAR";
    } else if (folderInput?.includes("logos")) {
        purpose = "ORG_LOGO";
    } else if (folderInput?.includes("org-documents")) {
        purpose = "ORG_KYB_DOCUMENT";
    }

    const result = await uploadFileSecure({
        file,
        purpose,
        userId: session.user.id,
        orgId,
        publicId,
    });

    if (!result.success) {
        return {
            success: false,
            publicId: null,
            url: null,
            imageUrl: null,
            message: result.message,
        };
    }

    return {
        success: true,
        publicId: result.publicId,
        url: result.url,
        imageUrl: result.imageUrl,
        uploadAssetId: result.uploadAssetId,
        scanStatus: result.scanStatus,
    };
}
