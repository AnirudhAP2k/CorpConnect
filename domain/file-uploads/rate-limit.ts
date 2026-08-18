import { prisma } from "@/lib/db";

const UPLOAD_RATE_LIMIT_PER_HOUR = process.env.UPLOAD_RATE_LIMIT_PER_HOUR
    ? parseInt(process.env.UPLOAD_RATE_LIMIT_PER_HOUR, 10)
    : 20;

export interface RateLimitResult {
    allowed: boolean;
    message: string;
    remaining?: number;
}

/**
 * Checks if a user has exceeded the upload rate limit.
 * Queries UploadAsset count for the user in the last hour.
 */
export async function checkUploadRateLimit(userId: string): Promise<RateLimitResult> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentCount = await prisma.uploadAsset.count({
        where: {
            userId,
            createdAt: { gte: oneHourAgo },
        },
    });

    const remaining = UPLOAD_RATE_LIMIT_PER_HOUR - recentCount;

    if (recentCount >= UPLOAD_RATE_LIMIT_PER_HOUR) {
        return {
            allowed: false,
            message: `Upload rate limit exceeded (${UPLOAD_RATE_LIMIT_PER_HOUR} uploads per hour). Please try again later.`,
            remaining: 0,
        };
    }

    return {
        allowed: true,
        message: "OK",
        remaining,
    };
}
