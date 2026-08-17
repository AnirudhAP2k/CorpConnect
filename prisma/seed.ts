/**
 * prisma/seed.ts
 *
 * Seeds the reference tables that the app cannot function without.
 *
 * `Industry` and `Category` are lookup tables: organization onboarding requires a
 * valid `industryId` and event creation requires a valid `categoryId`, both
 * validated as UUIDs. On a fresh database both tables are empty, which leaves the
 * onboarding and event-creation forms with empty dropdowns and no way past them.
 *
 * `AutomationWorkflowTemplate` rows are platform-wide n8n workflow catalog entries.
 * Webhook URLs are placeholders derived from N8N_WEBHOOK_BASE_URL — app admins must
 * update them to real n8n production webhook URLs after importing/activating workflows.
 *
 * Run with:
 *   pnpm db:seed          (or `npx prisma db seed`)
 *
 * Safe to run repeatedly — rows are matched on their unique `label` / `slug` and
 * existing ones are skipped, so no duplicates and no overwriting of labels edited in-app.
 */

import { PrismaClient, AutomationTrigger } from "@prisma/client";

const prisma = new PrismaClient();

const INDUSTRIES = [
    "Aerospace & Defence",
    "Agriculture & Agritech",
    "Automotive",
    "Banking",
    "Construction & Infrastructure",
    "Consumer Goods & FMCG",
    "Education & EdTech",
    "Energy & Utilities",
    "Financial Services",
    "Government & Public Sector",
    "Healthcare & Life Sciences",
    "Hospitality & Travel",
    "Information Technology & Services",
    "Insurance",
    "Legal Services",
    "Logistics & Supply Chain",
    "Manufacturing",
    "Media & Entertainment",
    "Mining & Metals",
    "Non-Profit & NGO",
    "Pharmaceuticals & Biotech",
    "Professional Services & Consulting",
    "Real Estate",
    "Retail & E-commerce",
    "Software Development",
    "Telecommunications",
];

const EVENT_CATEGORIES = [
    "Award Ceremony",
    "Conference",
    "Demo Day",
    "Hackathon",
    "Investor Pitch",
    "Job Fair",
    "Meetup",
    "Networking Mixer",
    "Panel Discussion",
    "Product Launch",
    "Roundtable",
    "Summit",
    "Trade Show",
    "Training & Certification",
    "Webinar",
    "Workshop",
];

function n8nWebhookBase(): string {
    const raw = process.env.N8N_WEBHOOK_BASE_URL || "https://n8n.example.com";
    // Outbound CorpConnect triggers require https://
    return raw.replace(/^http:\/\//i, "https://").replace(/\/$/, "");
}

const AUTOMATION_TEMPLATES: Array<{
    slug: string;
    name: string;
    description: string;
    trigger: AutomationTrigger;
    webhookPath: string;
    defaultPromptTemplate: string;
}> = [
    {
        slug: "registration-ops-agent",
        name: "Registration Ops Agent",
        description:
            "Agentic n8n workflow for new event registrations. Uses promptTemplate + contextData to decide follow-ups (e.g. dietary notices).",
        trigger: "EVENT_REGISTRATION",
        webhookPath: "/webhook/registration-ops-agent",
        defaultPromptTemplate:
            "If dietary restrictions are present in the registration context, email the caterer and thank the attendee. Otherwise take no action.",
    },
    {
        slug: "new-member-welcome",
        name: "New Member Welcome",
        description: "Fires when a member accepts an org invite — suitable for welcome Slack/email sequences.",
        trigger: "NEW_MEMBER_JOINED",
        webhookPath: "/webhook/new-member-welcome",
        defaultPromptTemplate:
            "Send a short welcome message to the new member and notify the org admins channel.",
    },
];

async function main() {
    console.log("Seeding reference data…");

    const industries = await prisma.industry.createMany({
        data: INDUSTRIES.map((label) => ({ label })),
        skipDuplicates: true,
    });
    console.log(
        `  Industries:       ${industries.count} inserted, ${INDUSTRIES.length - industries.count} already present`,
    );

    const categories = await prisma.category.createMany({
        data: EVENT_CATEGORIES.map((label) => ({ label })),
        skipDuplicates: true,
    });
    console.log(
        `  Event categories: ${categories.count} inserted, ${EVENT_CATEGORIES.length - categories.count} already present`,
    );

    const base = n8nWebhookBase();
    let templatesInserted = 0;
    let templatesSkipped = 0;
    for (const t of AUTOMATION_TEMPLATES) {
        const existing = await prisma.automationWorkflowTemplate.findUnique({
            where: { slug: t.slug },
            select: { id: true },
        });
        if (existing) {
            templatesSkipped++;
            continue;
        }
        await prisma.automationWorkflowTemplate.create({
            data: {
                slug: t.slug,
                name: t.name,
                description: t.description,
                trigger: t.trigger,
                webhookUrl: `${base}${t.webhookPath}`,
                defaultPromptTemplate: t.defaultPromptTemplate,
                isActive: true,
            },
        });
        templatesInserted++;
    }
    console.log(
        `  Automation templates: ${templatesInserted} inserted, ${templatesSkipped} already present`,
    );
    console.log(
        "  (Update AutomationWorkflowTemplate.webhookUrl to real n8n production URLs after activating workflows.)",
    );

    console.log("Seed complete.");
}

main()
    .catch((e) => {
        console.error("Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
