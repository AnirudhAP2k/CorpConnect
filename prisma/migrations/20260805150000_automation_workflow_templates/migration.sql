-- AlterTable: add promptTemplate (Phase 5b)
ALTER TABLE "AutomationRule" ADD COLUMN "promptTemplate" TEXT;

-- CreateTable
CREATE TABLE "AutomationWorkflowTemplate" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" "AutomationTrigger" NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "defaultPromptTemplate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationWorkflowTemplate_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN "templateId" UUID;

-- Make webhookUrl nullable (template-backed rules resolve URL from template)
ALTER TABLE "AutomationRule" ALTER COLUMN "webhookUrl" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AutomationWorkflowTemplate_slug_key" ON "AutomationWorkflowTemplate"("slug");

-- CreateIndex
CREATE INDEX "AutomationWorkflowTemplate_trigger_isActive_idx" ON "AutomationWorkflowTemplate"("trigger", "isActive");

-- CreateIndex
CREATE INDEX "AutomationRule_templateId_idx" ON "AutomationRule"("templateId");

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AutomationWorkflowTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
