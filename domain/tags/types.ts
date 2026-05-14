/**
 * Local Tag type alias for use within this domain's internal modules only.
 * External consumers should import `Tag` from "@/domain/tags" (Prisma type).
 */
import type { Tag as PrismaTag } from "@prisma/client";
export type Tag = PrismaTag;
