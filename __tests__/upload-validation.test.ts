import {
    detectMimeFromBuffer,
    isDangerousFilename,
    validateUpload,
} from "@/domain/file-uploads";

describe("Upload Security Validation", () => {
    // ── Buffer Samples ──────────────────────────────────────────────────────────
    const pdfBuffer = Buffer.from("%PDF-1.7\n%Fake PDF content for testing");
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const gifBuffer = Buffer.from("GIF89a\x01\x00\x01\x00", "binary");
    const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, 0x56, 0x38, 0x20, 0x18,
    ]);
    const textExecutableBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00Fake Exe");

    describe("Magic Byte Detection", () => {
        it("detects PDF magic bytes correctly", () => {
            const detected = detectMimeFromBuffer(pdfBuffer);
            expect(detected).toEqual({ mime: "application/pdf", ext: "pdf" });
        });

        it("detects JPEG magic bytes correctly", () => {
            const detected = detectMimeFromBuffer(jpegBuffer);
            expect(detected).toEqual({ mime: "image/jpeg", ext: "jpg" });
        });

        it("detects PNG magic bytes correctly", () => {
            const detected = detectMimeFromBuffer(pngBuffer);
            expect(detected).toEqual({ mime: "image/png", ext: "png" });
        });

        it("detects GIF magic bytes correctly", () => {
            const detected = detectMimeFromBuffer(gifBuffer);
            expect(detected).toEqual({ mime: "image/gif", ext: "gif" });
        });

        it("detects WebP magic bytes correctly", () => {
            const detected = detectMimeFromBuffer(webpBuffer);
            expect(detected).toEqual({ mime: "image/webp", ext: "webp" });
        });

        it("returns null for unrecognized binary formats", () => {
            const detected = detectMimeFromBuffer(textExecutableBuffer);
            expect(detected).toBeNull();
        });
    });

    describe("Filename & Extension Security", () => {
        it("flags dangerous extensions (exe, sh, bat, html, svg, js)", () => {
            expect(isDangerousFilename("malware.exe")).toBe(true);
            expect(isDangerousFilename("script.sh")).toBe(true);
            expect(isDangerousFilename("payload.html")).toBe(true);
            expect(isDangerousFilename("vector.svg")).toBe(true);
            expect(isDangerousFilename("code.js")).toBe(true);
        });

        it("flags double-extension spoofing attempts", () => {
            expect(isDangerousFilename("invoice.pdf.exe")).toBe(true);
            expect(isDangerousFilename("avatar.png.html")).toBe(true);
            expect(isDangerousFilename("document.docx.js")).toBe(true);
        });

        it("flags path traversal in filenames", () => {
            expect(isDangerousFilename("../secret.png")).toBe(true);
            expect(isDangerousFilename("..\\windows\\system32\\cmd.exe")).toBe(true);
        });

        it("allows safe image and document filenames", () => {
            expect(isDangerousFilename("user_profile_2026.png")).toBe(false);
            expect(isDangerousFilename("incorporation_certificate.pdf")).toBe(false);
            expect(isDangerousFilename("event_cover.jpg")).toBe(false);
        });
    });

    describe("validateUpload Policy Gatekeeper", () => {
        it("approves valid JPEG upload for PROFILE_AVATAR", () => {
            const result = validateUpload(jpegBuffer, "PROFILE_AVATAR", "avatar.jpg", "image/jpeg");
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.detectedMime).toBe("image/jpeg");
            }
        });

        it("rejects PDF upload for PROFILE_AVATAR policy", () => {
            const result = validateUpload(pdfBuffer, "PROFILE_AVATAR", "document.pdf", "application/pdf");
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.code).toBe("TYPE_NOT_ALLOWED");
            }
        });

        it("approves valid PDF upload for ORG_KYB_DOCUMENT", () => {
            const result = validateUpload(pdfBuffer, "ORG_KYB_DOCUMENT", "tax_cert.pdf", "application/pdf");
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.detectedMime).toBe("application/pdf");
            }
        });

        it("detects and rejects MIME spoofing (executable buffer declared as PDF)", () => {
            const result = validateUpload(
                textExecutableBuffer,
                "ORG_KYB_DOCUMENT",
                "invoice.pdf",
                "application/pdf"
            );
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.code).toBe("UNRECOGNIZED_FORMAT");
            }
        });

        it("detects and rejects declared header mismatch (PNG buffer declared as PDF)", () => {
            const result = validateUpload(
                pngBuffer,
                "ORG_KYB_DOCUMENT",
                "doc.pdf",
                "application/pdf"
            );
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.code).toBe("TYPE_MISMATCH");
            }
        });

        it("rejects file exceeding policy maximum size limit", () => {
            const hugeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB (Avatar max is 5MB)
            hugeBuffer.set(jpegBuffer, 0); // valid jpeg header

            const result = validateUpload(hugeBuffer, "PROFILE_AVATAR", "big.jpg", "image/jpeg");
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.code).toBe("FILE_TOO_LARGE");
            }
        });
    });
});
