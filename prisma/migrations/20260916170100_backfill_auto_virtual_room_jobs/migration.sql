INSERT INTO "JobQueue" (
    id,
    type,
    payload,
    "scheduledAt",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    'AUTO_CREATE_VIRTUAL_ROOM'::"JobType",
    jsonb_build_object(
        'eventId', e.id,
        'startsAt', to_char(e."startDateTime" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ),
    GREATEST(e."startDateTime", NOW()),
    NOW(),
    NOW()
FROM "Events" e
WHERE e."eventType" IN ('ONLINE', 'HYBRID')
  AND e."endDateTime" > NOW()
  AND NOT EXISTS (
      SELECT 1
      FROM "VirtualRoom" vr
      WHERE vr."eventId" = e.id
        AND vr."isActive" = true
  )
  AND NOT EXISTS (
      SELECT 1
      FROM "JobQueue" jq
      WHERE jq.type = 'AUTO_CREATE_VIRTUAL_ROOM'
        AND jq.payload->>'eventId' = e.id::text
        AND jq.status IN ('PENDING', 'PROCESSING')
  );
