import { prisma } from "@/lib/db";
import { aiService } from "@/lib/ai-service";

/**
 * Payload stored in JobQueue.payload for EMBED_EVENT jobs.
 * Enqueue whenever an event is created or its indexable fields are updated.
 */
export interface EmbedEventPayload {
    eventId: string;
}

/**
 * Payload stored in JobQueue.payload for EMBED_ORG jobs.
 * Enqueue whenever an org is created or its indexable fields are updated.
 */
export interface EmbedOrgPayload {
    orgId: string;
}

async function postToAiService(service: string, body: Record<string, unknown>): Promise<void> {

    try {
        switch (service) {
            case "EMBED_EVENT":
                await aiService.embedEvent(body.eventId as string, body.text as string);
                break;
            case "EMBED_ORG":
                await aiService.embedOrg(body.orgId as string, body.text as string);
                break;
            default:
                throw new Error(`Unknown service: ${service}`);
        }
    } catch (error) {
        console.error(`[Embed] Error generating ${service} embedding for service ${service} and id ${body.eventId || body.orgId}:`, error);
        throw error;
    }
}

// ─── Job handlers ──────────────────────────────────────────────────────────────

/**
 * Fetches the event from DB, builds the text representation, and POSTs it to
 * the AI service to generate + store the vector embedding.
 */
export async function processEmbedEvent(payload: EmbedEventPayload) {
    const { eventId } = payload;

    const event = await prisma.events.findUnique({
        where: { id: eventId },
        include: {
            category: { select: { label: true } },
            eventTags: { include: { tag: { select: { label: true } } } },
        },
    });

    if (!event) {
        console.warn(`[Embed] Event ${eventId} not found, skipping embedding`);
        return;
    }

    const tags = event.eventTags.map((et) => et.tag.label).join(", ");

    // Text format matches what embed.py expects:
    // f"{title}. {description}. Category: {category}. Tags: {tags}"
    const text = [
        event.title,
        event.description,
        `Category: ${event.category.label}`,
        tags ? `Tags: ${tags}` : null,
        `Location: ${event.location}`,
        `Type: ${event.eventType}`,
    ]
        .filter(Boolean)
        .join(". ");

    console.log(`[Embed] Generating event embedding for "${event.title}" (${eventId})`);
    await postToAiService("EMBED_EVENT", { eventId, text });
    console.log(`[Embed] ✓ Event embedding stored for ${eventId}`);
}

/**
 * Fetches the org from DB, builds the text representation, and POSTs it to
 * the AI service to generate + store the vector embedding.
 */
export async function processEmbedOrg(payload: EmbedOrgPayload) {
    const { orgId } = payload;

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
            industry: { select: { label: true } },
            orgTags: { include: { tag: { select: { label: true } } } },
        },
    });

    if (!org) {
        console.warn(`[Embed] Org ${orgId} not found, skipping embedding`);
        return;
    }

    const tags = org.orgTags.map((ot) => ot.tag.label).join(", ");
    const services = org.services.join(", ");
    const technologies = org.technologies.join(", ");
    const interests = org.partnershipInterests.join(", ");

    // Text format matches what embed.py expects:
    // f"{name}. {description}. Industry: {industry}. Size: {size}"
    const text = [
        org.name,
        org.description,
        `Industry: ${org.industry.label}`,
        `Size: ${org.size ?? "Unknown"}`,
        org.location ? `Location: ${org.location}` : null,
        services ? `Services: ${services}` : null,
        technologies ? `Technologies: ${technologies}` : null,
        interests ? `Partnership interests: ${interests}` : null,
        tags ? `Tags: ${tags}` : null,
    ]
        .filter(Boolean)
        .join(". ");

    console.log(`[Embed] Generating org embedding for "${org.name}" (${orgId})`);
    await postToAiService("EMBED_ORG", { orgId, text });
    console.log(`[Embed] ✓ Org embedding stored for ${orgId}`);
}
