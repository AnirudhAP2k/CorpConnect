WITH ranked_open_sessions AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY "roomId", "userId"
            ORDER BY "joinedAt" DESC, id DESC
        ) AS row_number
    FROM "VirtualSession"
    WHERE "leftAt" IS NULL
)
UPDATE "VirtualSession" session
SET
    "leftAt" = NOW(),
    "durationSecs" = GREATEST(
        0,
        EXTRACT(EPOCH FROM (NOW() - session."joinedAt"))::INT
    )
FROM ranked_open_sessions ranked
WHERE session.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX "VirtualSession_roomId_userId_open_key"
ON "VirtualSession" ("roomId", "userId")
WHERE "leftAt" IS NULL;
