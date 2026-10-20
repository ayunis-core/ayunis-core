-- AYC-1180: Stefan confirmed all existing Nidda users had completed training
-- at 2026-10-07T12:09:09.646Z. The completion date is administrative.
INSERT INTO academy_completion (id, "userId", "completedAt")
SELECT gen_random_uuid()::text, id, TIMESTAMP '2026-10-07 00:00:00'
FROM users
WHERE "orgId" = '64dc46da-a9b8-4510-b666-1c0c9b6d9517'
  AND "createdAt" <= TIMESTAMP '2026-10-07 12:09:09.646'
ON CONFLICT ("userId") DO NOTHING
RETURNING id, "userId", "completedAt";
