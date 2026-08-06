import * as net from "net";
import cloudinary from "@/lib/cloudinary";
import { prisma } from "@/lib/db";
import type { ScanUploadPayload, UploadPurpose } from "./types";
import { UPLOAD_POLICIES } from "./validation";

const CLAMAV_HOST = process.env.CLAMAV_HOST || "";
const CLAMAV_PORT = parseInt(process.env.CLAMAV_PORT || "3310", 10);
const CLAMAV_TIMEOUT_MS = parseInt(process.env.CLAMAV_TIMEOUT_MS || "120000", 10);

export interface ScanResult {
    clean: boolean;
    verdict: string;
    engine: string;
}

/**
 * Streams a buffer to ClamAV daemon via the INSTREAM protocol over TCP.
 *
 * Protocol:
 * 1. Send "zINSTREAM\0"
 * 2. For each chunk: send 4-byte big-endian length + chunk data
 * 3. Send 4-byte zero-length to signal end
 * 4. Read response: "stream: OK\0" or "stream: <virus> FOUND\0"
 */
export function scanWithClamAV(buffer: Buffer): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
        const clamHost = process.env.CLAMAV_HOST || "";
        const clamPort = parseInt(process.env.CLAMAV_PORT || "3310", 10);
        const timeoutMs = parseInt(process.env.CLAMAV_TIMEOUT_MS || "120000", 10);

        if (!clamHost) {
            // ClamAV not configured — graceful degradation
            console.warn("[ClamAV] CLAMAV_HOST not configured. Auto-approving upload (dev mode).");
            return resolve({
                clean: true,
                verdict: "auto-approved (scanner not configured)",
                engine: "none",
            });
        }

        const socket = new net.Socket();
        let responseData = "";

        socket.setTimeout(timeoutMs);

        socket.on("data", (data) => {
            responseData += data.toString();
        });

        socket.on("end", () => {
            const response = responseData.trim().replace(/\0/g, "");
            if (response.includes("OK")) {
                resolve({ clean: true, verdict: "OK", engine: "clamav" });
            } else if (response.includes("FOUND")) {
                // Extract virus name: "stream: Win.Test.EICAR_HDB-1 FOUND"
                const match = response.match(/stream:\s*(.+)\s+FOUND/);
                const virusName = match?.[1]?.trim() || "unknown malware";
                resolve({ clean: false, verdict: virusName, engine: "clamav" });
            } else {
                reject(new Error(`ClamAV unexpected response: ${response}`));
            }
        });

        socket.on("timeout", () => {
            socket.destroy();
            reject(new Error("ClamAV scan timed out"));
        });

        socket.on("error", (err) => {
            reject(new Error(`ClamAV connection error: ${err.message}`));
        });

        socket.connect(clamPort, clamHost, () => {
            // Send INSTREAM command
            socket.write("zINSTREAM\0");

            // Send buffer in chunks (max 2MB per chunk for ClamAV)
            const CHUNK_SIZE = 2 * 1024 * 1024;
            for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
                const chunk = buffer.subarray(offset, offset + CHUNK_SIZE);
                const lengthHeader = Buffer.alloc(4);
                lengthHeader.writeUInt32BE(chunk.length, 0);
                socket.write(lengthHeader);
                socket.write(chunk);
            }

            // Send zero-length terminator
            const terminator = Buffer.alloc(4);
            terminator.writeUInt32BE(0, 0);
            socket.write(terminator);
        });
    });
}

/**
 * Fetches a file from Cloudinary by public_id, scans with ClamAV,
 * and updates the UploadAsset record accordingly.
 */
export async function processUploadScan(payload: ScanUploadPayload): Promise<void> {
    const { uploadAssetId, cloudinaryPublicId, purpose: payloadPurpose } = payload;

    const asset = await prisma.uploadAsset.findUnique({
        where: { id: uploadAssetId },
    });

    if (!asset) {
        console.error(`[UploadScan] UploadAsset ${uploadAssetId} not found`);
        return;
    }

    if (asset.scanStatus !== "PENDING") {
        console.log(`[UploadScan] Asset ${uploadAssetId} already processed (${asset.scanStatus}), skipping`);
        return;
    }

    const purpose = (payloadPurpose || asset.purpose) as UploadPurpose;
    const policy = UPLOAD_POLICIES[purpose];
    const assetType = policy?.accessType || "upload";

    try {
        // Fetch file bytes from Cloudinary (signed if authenticated)
        const resourceUrl = cloudinary.url(cloudinaryPublicId, {
            resource_type: "raw",
            type: assetType,
            sign_url: assetType === "authenticated",
            secure: true,
        });

        const response = await fetch(resourceUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch file from Cloudinary: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Scan with ClamAV
        const result = await scanWithClamAV(buffer);

        if (result.clean) {
            // Approve the asset
            const secureUrl = cloudinary.url(cloudinaryPublicId, {
                resource_type: "raw",
                type: assetType,
                secure: true,
            });

            await prisma.uploadAsset.update({
                where: { id: uploadAssetId },
                data: {
                    scanStatus: "APPROVED",
                    secureUrl,
                    scanEngine: result.engine,
                    scanVerdict: result.verdict,
                    scannedAt: new Date(),
                },
            });

            console.log(`[UploadScan] ✓ Asset ${uploadAssetId} APPROVED (${result.verdict})`);
        } else {
            // Reject and delete/restrict the Cloudinary asset
            try {
                await cloudinary.uploader.destroy(cloudinaryPublicId, {
                    resource_type: "raw",
                    type: assetType,
                });
            } catch (deleteErr: any) {
                console.error(`[UploadScan] Failed to delete infected asset from Cloudinary:`, deleteErr?.message);
            }

            await prisma.uploadAsset.update({
                where: { id: uploadAssetId },
                data: {
                    scanStatus: "REJECTED",
                    scanEngine: result.engine,
                    scanVerdict: result.verdict,
                    scannedAt: new Date(),
                },
            });

            console.error(`[UploadScan] ✗ Asset ${uploadAssetId} REJECTED — malware detected: ${result.verdict}`);
        }
    } catch (error: any) {
        console.error(`[UploadScan] Scan failed for asset ${uploadAssetId}:`, error?.message);

        // Check if max attempts exhausted — the job processor handles retry logic,
        // but if this is the last attempt, mark as SCAN_FAILED (fail closed for KYB)
        const jobs = await prisma.jobQueue.findMany({
            where: {
                type: "SCAN_UPLOAD",
                status: { in: ["PROCESSING", "PENDING"] },
            },
        });

        const relevantJob = jobs.find((j: any) => {
            const p = j.payload as any;
            return p?.uploadAssetId === uploadAssetId;
        });

        if (relevantJob && relevantJob.attempts >= relevantJob.maxAttempts) {
            await prisma.uploadAsset.update({
                where: { id: uploadAssetId },
                data: {
                    scanStatus: "SCAN_FAILED",
                    scanVerdict: `Scan postponed due to scanner outage: ${error?.message}`,
                    scannedAt: new Date(),
                },
            });
            console.warn(`[UploadScan] Asset ${uploadAssetId} preserved in quarantine & marked SCAN_FAILED (scanner outage)`);
        }

        // Re-throw so the job processor can handle retry
        throw error;
    }
}

/**
 * Periodically re-queues SCAN_UPLOAD jobs for assets whose previous scan failed
 * due to scanner infrastructure outages (scanStatus === "SCAN_FAILED").
 */
export async function requeueFailedScans(): Promise<number> {
    const failedAssets = await prisma.uploadAsset.findMany({
        where: {
            scanStatus: "SCAN_FAILED",
        },
        select: {
            id: true,
            cloudinaryPublicId: true,
            purpose: true,
            organizationId: true,
            orgDocumentId: true,
        },
    });

    if (failedAssets.length === 0) return 0;

    let requeued = 0;
    for (const asset of failedAssets) {
        // Reset status to PENDING
        await prisma.uploadAsset.update({
            where: { id: asset.id },
            data: {
                scanStatus: "PENDING",
                scanVerdict: "Re-queued for malware scan",
            },
        });

        // Enqueue new SCAN_UPLOAD job
        await prisma.jobQueue.create({
            data: {
                type: "SCAN_UPLOAD",
                payload: {
                    uploadAssetId: asset.id,
                    cloudinaryPublicId: asset.cloudinaryPublicId,
                    purpose: asset.purpose,
                    orgId: asset.organizationId ?? undefined,
                    orgDocumentId: asset.orgDocumentId ?? undefined,
                } as any,
                maxAttempts: 3,
            },
        });
        requeued++;
    }

    if (requeued > 0) {
        console.log(`[requeueFailedScans] ✓ Re-queued ${requeued} quarantined assets for malware scan`);
    }

    return requeued;
}
