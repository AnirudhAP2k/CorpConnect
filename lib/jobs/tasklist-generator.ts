/**
 * Job handler for GENERATE_TASKLIST jobs.
 * Triggered immediately after an EventPitch is approved (reviewPitchAction).
 *
 * Flow:
 *   1. Load approved EventPitch from DB
 *   2. Call AI service → POST /chat/brainstorm/tasklist
 *   3. AI returns structured milestone checklist (or deterministic fallback)
 *   4. Persist all EventTask records in a single createMany transaction
 *
 * Design decisions:
 *   - Idempotent: if tasks already exist for the pitchId, skip generation
 *   - AI failure → the Python service's own fallback is returned (never null)
 *   - All dates stored as dueDayOffset (relative to event start), not absolute
 */

import { prisma } from "@/lib/db";
import { aiService } from "@/lib/ai-service";
import type { AIEventTasklistRequest } from "@/lib/ai-service";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerateTasklistPayload {
    pitchId: string;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function processGenerateTasklist(
    payload: GenerateTasklistPayload,
): Promise<void> {
    const { pitchId } = payload;

    // 1. Load the approved pitch
    const pitch = await prisma.eventPitch.findUnique({
        where: { id: pitchId },
        select: {
            id: true,
            title: true,
            description: true,
            targetAudience: true,
            location: true,
            estimatedBudget: true,
            startDateTime: true,
            endDateTime: true,
            aiBrief: true,
            status: true,
        },
    });

    if (!pitch) {
        console.error(`[processGenerateTasklist] Pitch not found: ${pitchId}`);
        return;
    }

    if (pitch.status !== "APPROVED") {
        console.warn(`[processGenerateTasklist] Pitch ${pitchId} is not APPROVED (status: ${pitch.status}). Skipping.`);
        return;
    }

    // 2. Idempotency: skip if tasks already generated
    const existingCount = await prisma.eventTask.count({ where: { pitchId } });
    if (existingCount > 0) {
        console.info(`[processGenerateTasklist] Tasks already exist for pitch ${pitchId} (${existingCount} tasks). Skipping.`);
        return;
    }

    // 3. Build AI service request
    const req: AIEventTasklistRequest = {
        pitchId: pitch.id,
        title: pitch.title,
        description: pitch.description,
        targetAudience: pitch.targetAudience,
        location: pitch.location,
        estimatedBudget: pitch.estimatedBudget,
        startDateTime: pitch.startDateTime?.toISOString() ?? null,
        endDateTime: pitch.endDateTime?.toISOString() ?? null,
        aiBrief: pitch.aiBrief,
    };

    // 4. Call AI service (fallback is handled server-side in Python if LLM unavailable)
    const result = await aiService.generateEventTasklist(req);

    if (!result || result.tasks.length === 0) {
        // This should not happen since the Python service has a deterministic fallback,
        // but guard against unexpected null/empty responses
        console.error(`[processGenerateTasklist] AI service returned empty tasklist for pitch ${pitchId}. Aborting.`);
        return;
    }

    // 5. Persist all tasks in a single batch
    await prisma.eventTask.createMany({
        data: result.tasks.map((task) => ({
            pitchId: pitchId,
            title: task.title,
            description: task.description ?? null,
            dueDayOffset: task.dueDayOffset,
            priority: Math.max(1, Math.min(3, task.priority)), // clamp 1–3
            assignedRole: task.assignedRole ?? null,
            isCompleted: false,
        })),
        skipDuplicates: true,
    });

    console.info(
        `[processGenerateTasklist] Generated ${result.tasks.length} tasks for pitch ${pitchId}`
    );
}
