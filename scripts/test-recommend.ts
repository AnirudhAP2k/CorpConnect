import { prisma } from "../lib/db";
import { getMatchingOrgsForEvent } from "../data/events";

async function run() {
    console.log("--- Testing Smart Recommendations ---");

    // Find an event that has at least 2 different orgs participating
    const participations = await prisma.eventParticipation.findMany({
        where: { organizationId: { not: null } },
        include: {
            event: { select: { id: true, title: true, organizationId: true } }
        }
    });

    // Group by event
    const eventMap = new Map<string, string[]>();
    for (const p of participations) {
        if (!p.organizationId) continue;
        const orgs = eventMap.get(p.event.id) || [];
        if (!orgs.includes(p.organizationId) && p.organizationId !== p.event.organizationId) {
            orgs.push(p.organizationId);
        }
        eventMap.set(p.event.id, orgs);
    }

    // Find first event with >= 2 guest orgs
    let testEventId = "";
    let callerOrgId = "";

    for (const [eventId, orgs] of eventMap.entries()) {
        if (orgs.length >= 2) {
            testEventId = eventId;
            callerOrgId = orgs[0];
            break;
        }
    }

    if (!testEventId) {
        console.log("Could not find an event with at least 2 participating guest organizations to test matching.");
        console.log("Please create an event and register at least 2 different guest orgs for it first.");
        process.exit(0);
    }

    const event = await prisma.events.findUnique({ where: { id: testEventId } });
    const caller = await prisma.organization.findUnique({ where: { id: callerOrgId } });

    console.log(`Testing with Event: "${event?.title}" (${testEventId})`);
    console.log(`Caller Org ID: "${caller?.name}" (${callerOrgId})`);

    console.log("\nFetching recommendations...");
    const matches = await getMatchingOrgsForEvent(testEventId, callerOrgId);

    console.log("\n--- Results ---");
    if (matches.length === 0) {
        console.log("No matches found.");
    } else {
        matches.forEach((match, i) => {
            console.log(`${i + 1}. ${match.name}`);
            console.log(`   Score: ${match.score}`);
            console.log(`   Source: ${match.source}`);
            console.log(`   Reason: ${match.matchReason}`);
        });
    }

    console.log("\n--- Done ---");
    process.exit(0);
}

run().catch(console.error);
