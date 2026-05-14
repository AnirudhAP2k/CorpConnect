import "dotenv/config";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
    },
});

pool.on("error", (err) => {
    console.error("[lv-service] Unexpected pg pool error:", err);
});
