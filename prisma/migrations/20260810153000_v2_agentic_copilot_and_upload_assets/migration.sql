-- AlterEnum: Add AGENT to ChatContextType
ALTER TYPE "ChatContextType" ADD VALUE 'AGENT';

-- AlterEnum: Add SCAN_UPLOAD to JobType
ALTER TYPE "JobType" ADD VALUE 'SCAN_UPLOAD';

-- CreateEnum
CREATE TYPE "UploadScanStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SCAN_FAILED');

-- CreateEnum
CREATE TYPE "UploadPurposeEnum" AS ENUM ('PROFILE_AVATAR', 'EVENT_IMAGE', 'ORG_LOGO', 'ORG_KYB_DOCUMENT');

-- CreateTable
CREATE TABLE "UploadAsset" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID,
    "purpose" "UploadPurposeEnum" NOT NULL,
    "scanStatus" "UploadScanStatus" NOT NULL DEFAULT 'PENDING',
    "detectedMime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "secureUrl" TEXT,
    "scanEngine" TEXT,
    "scanVerdict" TEXT,
    "scannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgDocumentId" UUID,

    CONSTRAINT "UploadAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadAsset_orgDocumentId_key" ON "UploadAsset"("orgDocumentId");

-- CreateIndex
CREATE INDEX "UploadAsset_scanStatus_createdAt_idx" ON "UploadAsset"("scanStatus", "createdAt");

-- CreateIndex
CREATE INDEX "UploadAsset_userId_createdAt_idx" ON "UploadAsset"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UploadAsset" ADD CONSTRAINT "UploadAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadAsset" ADD CONSTRAINT "UploadAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadAsset" ADD CONSTRAINT "UploadAsset_orgDocumentId_fkey" FOREIGN KEY ("orgDocumentId") REFERENCES "OrgDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
