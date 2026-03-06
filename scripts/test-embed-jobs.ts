import { prisma } from "../lib/db";
import { JobType } from "@prisma/client";
import { processJobQueue } from "../lib/jobs/job-processor";

async function run() {
    console.log("--- Testing Embed Jobs ---");

    // 1. Find a test event and org with null embedding
    const events = await prisma.$queryRaw<[{ id: string }]>`SELECT id FROM "Events" WHERE embedding IS NULL LIMIT 1;`;
    const orgs = await prisma.$queryRaw<[{ id: string }]>`SELECT id FROM "Organization" WHERE embedding IS NULL LIMIT 1;`;

    const event = events.length > 0 ? events[0] : null;
    const org = orgs.length > 0 ? orgs[0] : null;

    if (event) {
        console.log(`Enqueueing EVENT embed job for: ${event.id}`);
        await prisma.jobQueue.create({
            data: { type: JobType.EMBED_EVENT, payload: { eventId: event.id } }
        });
    } else {
        console.log("No events found in DB to test.");
    }

    if (org) {
        console.log(`Enqueueing ORG embed job for: ${org.id}`);
        await prisma.jobQueue.create({
            data: { type: JobType.EMBED_ORG, payload: { orgId: org.id } }
        });
    } else {
        console.log("No organizations found in DB to test.");
    }

    console.log("\n--- Triggering Job Processor ---");
    await processJobQueue();

    console.log("\n--- Done ---");
    process.exit(0);
}

run().catch(console.error);
