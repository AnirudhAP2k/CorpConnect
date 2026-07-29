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
 * Run with:
 *   pnpm db:seed          (or `npx prisma db seed`)
 *
 * Safe to run repeatedly — rows are matched on their unique `label` and existing
 * ones are skipped, so no duplicates and no overwriting of labels edited in-app.
 */

import { PrismaClient } from "@prisma/client";

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
