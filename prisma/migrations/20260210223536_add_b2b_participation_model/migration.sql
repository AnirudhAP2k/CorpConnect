-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('ONLINE', 'OFFLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "OrganizationSize" AS ENUM ('STARTUP', 'SME', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('REGISTERED', 'ATTENDED', 'CANCELLED', 'WAITLISTED');

-- AlterTable User: Add organization context fields
ALTER TABLE "User" ADD COLUMN "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "organizationId" UUID;

-- AlterTable Organization: Add new fields
ALTER TABLE "Organization" ADD COLUMN "location" TEXT;
ALTER TABLE "Organization" ADD COLUMN "size" "OrganizationSize" DEFAULT 'STARTUP';
ALTER TABLE "Organization" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Events: Add new event metadata fields
ALTER TABLE "Events" ADD COLUMN "visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "Events" ADD COLUMN "eventType" "EventType" NOT NULL DEFAULT 'OFFLINE';
ALTER TABLE "Events" ADD COLUMN "maxAttendees" INTEGER;
ALTER TABLE "Events" ADD COLUMN "attendeeCount" INTEGER NOT NULL DEFAULT 0;

-- Rename Orders table to EventParticipation
ALTER TABLE "Orders" RENAME TO "EventParticipation";

-- Rename columns in EventParticipation
ALTER TABLE "EventParticipation" RENAME COLUMN "buyerId" TO "userId";

-- Add new columns to EventParticipation
ALTER TABLE "EventParticipation" ADD COLUMN "organizationId" UUID;
ALTER TABLE "EventParticipation" ADD COLUMN "status" "ParticipationStatus" NOT NULL DEFAULT 'REGISTERED';
ALTER TABLE "EventParticipation" ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EventParticipation" ADD COLUMN "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "EventParticipation" ADD COLUMN "attendedAt" TIMESTAMP(3);
ALTER TABLE "EventParticipation" ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Make totalAmount nullable (not all events require payment)
ALTER TABLE "EventParticipation" ALTER COLUMN "totalAmount" DROP NOT NULL;

-- Create indexes for performance
CREATE INDEX "Events_organizationId_idx" ON "Events"("organizationId");
CREATE INDEX "Events_categoryId_idx" ON "Events"("categoryId");
CREATE INDEX "Events_startDateTime_idx" ON "Events"("startDateTime");
CREATE INDEX "Events_visibility_idx" ON "Events"("visibility");

CREATE INDEX "Organization_industryId_idx" ON "Organization"("industryId");
CREATE INDEX "Organization_createdBy_idx" ON "Organization"("createdBy");

CREATE INDEX "EventParticipation_userId_idx" ON "EventParticipation"("userId");
CREATE INDEX "EventParticipation_organizationId_idx" ON "EventParticipation"("organizationId");
CREATE INDEX "EventParticipation_status_idx" ON "EventParticipation"("status");

-- Add unique constraint for one participation per user per event
CREATE UNIQUE INDEX "EventParticipation_eventId_userId_key" ON "EventParticipation"("eventId", "userId");

-- Add unique constraint for one participation per org per event (when org is specified)
-- Note: This allows NULL values, so multiple NULL organizationIds are allowed
CREATE UNIQUE INDEX "EventParticipation_eventId_organizationId_key" ON "EventParticipation"("eventId", "organizationId") WHERE "organizationId" IS NOT NULL;

-- Add foreign key for User.organizationId
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign key for EventParticipation.organizationId
ALTER TABLE "EventParticipation" ADD CONSTRAINT "EventParticipation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update existing foreign key name from buyer to user
ALTER TABLE "EventParticipation" DROP CONSTRAINT "Orders_buyerId_fkey";
ALTER TABLE "EventParticipation" ADD CONSTRAINT "EventParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update existing foreign key name for event
ALTER TABLE "EventParticipation" DROP CONSTRAINT "Orders_eventId_fkey";
ALTER TABLE "EventParticipation" ADD CONSTRAINT "EventParticipation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
