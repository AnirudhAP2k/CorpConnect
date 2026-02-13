/*
  Warnings:

  - A unique constraint covering the columns `[eventId,organizationId]` on the table `EventParticipation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "EventParticipation" RENAME CONSTRAINT "Orders_pkey" TO "EventParticipation_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipation_eventId_organizationId_key" ON "EventParticipation"("eventId", "organizationId");

-- RenameIndex
ALTER INDEX "Orders_stripeId_key" RENAME TO "EventParticipation_stripeId_key";
