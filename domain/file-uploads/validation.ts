import type { UploadPolicy, UploadPurpose, ValidationResult } from "./types";

const MAX_5MB = 5 * 1024 * 1024;
const MAX_10MB = 10 * 1024 * 1024;

const RASTER_IMAGE_MIMES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
]);

const KYB_DOCUMENT_MIMES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

export const UPLOAD_POLICIES: Record<UploadPurpose, UploadPolicy> = {
    PROFILE_AVATAR: {
        maxSizeBytes: MAX_5MB,
        allowedMimeTypes: RASTER_IMAGE_MIMES,
        defaultFolder: "uploads/avatars",
        resourceType: "image",
        accessType: "upload",
        imagePreset: "avatar",
    },
    EVENT_IMAGE: {
        maxSizeBytes: MAX_10MB,
        allowedMimeTypes: RASTER_IMAGE_MIMES,
        defaultFolder: "uploads/events",
        resourceType: "image",
        accessType: "upload",
    },
    ORG_LOGO: {
        maxSizeBytes: MAX_5MB,
        allowedMimeTypes: RASTER_IMAGE_MIMES,
        defaultFolder: "uploads/logos",
        resourceType: "image",
        accessType: "upload",
    },
    ORG_KYB_DOCUMENT: {
        maxSizeBytes: MAX_10MB,
        allowedMimeTypes: KYB_DOCUMENT_MIMES,
        defaultFolder: "org-documents",
        resourceType: "raw",
        accessType: "authenticated",
        requiresScan: true,
    },
};

export function isValidUploadPurpose(purpose: string): purpose is UploadPurpose {
    return purpose in UPLOAD_POLICIES;
}

export interface MagicByteMatch {
    mime: string;
    ext: string;
}

/**
 * Inspects raw buffer magic bytes to detect file MIME type independently of HTTP headers.
 */
export function detectMimeFromBuffer(buffer: Buffer): MagicByteMatch | null {
    if (!buffer || buffer.length < 4) return null;

    // PDF: %PDF- (25 50 44 46 2D)
    if (
        buffer.length >= 5 &&
        buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46 &&
        buffer[4] === 0x2d
    ) {
        return { mime: "application/pdf", ext: "pdf" };
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { mime: "image/jpeg", ext: "jpg" };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    ) {
        return { mime: "image/png", ext: "png" };
    }

    // GIF: GIF87a or GIF89a (47 49 46 38 37/39 61)
    if (
        buffer.length >= 6 &&
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38 &&
        (buffer[4] === 0x37 || buffer[4] === 0x39) &&
        buffer[5] === 0x61
    ) {
        return { mime: "image/gif", ext: "gif" };
    }

    // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
    if (
        buffer.length >= 12 &&
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
    ) {
        return { mime: "image/webp", ext: "webp" };
    }

    // AVIF: ....ftypavif or ....ftypavis
    if (
        buffer.length >= 12 &&
        buffer[4] === 0x66 &&
        buffer[5] === 0x74 &&
        buffer[6] === 0x79 &&
        buffer[7] === 0x70
    ) {
        const brand = buffer.toString("ascii", 8, 12);
        if (brand === "avif" || brand === "avis" || brand === "mif1") {
            return { mime: "image/avif", ext: "avif" };
        }
    }

    return null;
}

const DANGEROUS_EXTENSIONS = new Set([
    "exe", "bat", "cmd", "sh", "ps1", "vbs", "jar",
    "html", "htm", "svg", "js", "mjs", "cjs", "php",
    "asp", "aspx", "jsp", "py", "rb", "dll", "so", "dylib",
]);

export function isDangerousFilename(filename: string): boolean {
    if (!filename) return false;
    if (filename.includes("../") || filename.includes("..\\")) return true;

    const parts = filename.toLowerCase().split(".");
    if (parts.length > 2) {
        for (let i = 1; i < parts.length; i++) {
            if (DANGEROUS_EXTENSIONS.has(parts[i])) return true;
        }
    } else if (parts.length === 2) {
        if (DANGEROUS_EXTENSIONS.has(parts[1])) return true;
    }

    return false;
}

export function validateUpload(
    buffer: Buffer,
    purpose: UploadPurpose,
    filename?: string,
    declaredMime?: string
): ValidationResult {
    if (!buffer || buffer.length === 0) {
        return { ok: false, code: "NO_FILE", message: "No file provided" };
    }

    if (!isValidUploadPurpose(purpose)) {
        return { ok: false, code: "INVALID_PURPOSE", message: "Invalid upload purpose" };
    }

    const policy = UPLOAD_POLICIES[purpose];

    if (buffer.length > policy.maxSizeBytes) {
        const maxMB = policy.maxSizeBytes / (1024 * 1024);
        return {
            ok: false,
            code: "FILE_TOO_LARGE",
            message: `File size exceeds max limit of ${maxMB}MB`,
        };
    }

    if (filename && isDangerousFilename(filename)) {
        return {
            ok: false,
            code: "DANGEROUS_FILENAME",
            message: "Filename contains unsafe extensions or path sequences",
        };
    }

    const detected = detectMimeFromBuffer(buffer);
    if (!detected) {
        return {
            ok: false,
            code: "UNRECOGNIZED_FORMAT",
            message: "File format could not be verified by content inspection",
        };
    }

    if (!policy.allowedMimeTypes.has(detected.mime)) {
        return {
            ok: false,
            code: "TYPE_NOT_ALLOWED",
            message: `File type "${detected.mime}" is not allowed for ${purpose}`,
        };
    }

    if (declaredMime) {
        const normalizedDeclared = declaredMime.toLowerCase().trim();
        if (
            normalizedDeclared !== "application/octet-stream" &&
            normalizedDeclared !== detected.mime
        ) {
            const isJpegPair =
                (normalizedDeclared === "image/jpg" || normalizedDeclared === "image/jpeg") &&
                (detected.mime === "image/jpeg" || detected.mime === "image/jpg");
            if (!isJpegPair) {
                return {
                    ok: false,
                    code: "TYPE_MISMATCH",
                    message: `Declared header "${declaredMime}" does not match detected file content "${detected.mime}"`,
                };
            }
        }
    }

    return {
        ok: true,
        detectedMime: detected.mime,
        detectedExt: detected.ext,
        buffer,
    };
}
