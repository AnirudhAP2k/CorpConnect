export type UploadPurpose =
    | "PROFILE_AVATAR"
    | "EVENT_IMAGE"
    | "ORG_LOGO"
    | "ORG_KYB_DOCUMENT";

export interface UploadPolicy {
    maxSizeBytes: number;
    allowedMimeTypes: Set<string>;
    defaultFolder: string;
    resourceType: "image" | "raw" | "auto";
    accessType?: "upload" | "authenticated" | "private";
    imagePreset?: "avatar";
    requiresScan?: boolean;
}

export type ValidationResult =
    | {
          ok: true;
          detectedMime: string;
          detectedExt: string;
          buffer: Buffer;
      }
    | {
          ok: false;
          code:
              | "NO_FILE"
              | "FILE_TOO_LARGE"
              | "INVALID_PURPOSE"
              | "TYPE_NOT_ALLOWED"
              | "TYPE_MISMATCH"
              | "DANGEROUS_FILENAME"
              | "UNRECOGNIZED_FORMAT"
              | "RATE_LIMITED";
          message: string;
      };

export interface UploadSecureInput {
    file: File;
    purpose: UploadPurpose;
    userId?: string;
    orgId?: string;
    publicId?: string;
}

export type UploadSecureResult =
    | {
          success: true;
          publicId: string | null;
          url: string;
          imageUrl: string;
          detectedMime: string;
          detectedExt: string;
          purpose: UploadPurpose;
          scanStatus: "APPROVED" | "PENDING";
          uploadAssetId: string | null;
      }
    | {
          success: false;
          publicId: null;
          url: null;
          imageUrl: null;
          message: string;
          code?: string;
      };

export interface ScanUploadPayload {
    uploadAssetId: string;
    cloudinaryPublicId: string;
    purpose: UploadPurpose;
    orgId?: string;
    orgDocumentId?: string;
}
