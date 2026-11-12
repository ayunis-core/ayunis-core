import { Client } from "pg";
import { randomUUID } from "node:crypto";
import { config } from "../config";

function databasePort(): number {
  if (process.env.E2E_POSTGRES_PORT) {
    return Number(process.env.E2E_POSTGRES_PORT);
  }
  const apiPort = Number(new URL(config.apiURL).port || "3000");
  return 5432 + (apiPort - 3000);
}

function createDatabaseClient(): Client {
  return new Client({
    host: process.env.E2E_POSTGRES_HOST ?? "localhost",
    port: databasePort(),
    user: process.env.E2E_POSTGRES_USER ?? "postgres",
    password: process.env.E2E_POSTGRES_PASSWORD ?? "postgres",
    database: process.env.E2E_POSTGRES_DB ?? "ayunis",
  });
}

export async function setSubscriptionAccessEnd(
  subscriptionId: string,
  endsAt: Date | null,
): Promise<void> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    const result = await client.query(
      'UPDATE subscriptions SET "endsAt" = $1 WHERE id = $2',
      [endsAt, subscriptionId],
    );
    if (result.rowCount !== 1) {
      throw new Error(`Subscription ${subscriptionId} was not updated`);
    }
  } finally {
    await client.end();
  }
}

export async function countSubscriptionAccessAdjustments(
  subscriptionId: string,
  reason: string,
): Promise<number> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM subscription_access_adjustments
       WHERE "subscriptionId" = $1 AND reason = $2`,
      [subscriptionId, reason],
    );
    return Number(result.rows[0]?.count ?? 0);
  } finally {
    await client.end();
  }
}

export async function seedCertificateOverviewMembers(
  orgId: string,
  prefix: string,
) {
  const client = createDatabaseClient();
  await client.connect();
  try {
    const members = Array.from({ length: 26 }, (_, index) => ({
      id: randomUUID(),
      name: `${prefix} ${String(index).padStart(2, "0")}`,
      email: `${prefix}-${index}@e2e.local`,
    }));
    const excluded = {
      id: randomUUID(),
      name: `${prefix} Completed`,
      email: `${prefix}-completed@e2e.local`,
    };
    const unrelated = {
      id: randomUUID(),
      name: "Unrelated Member",
      email: `unrelated-${randomUUID()}@example.com`,
    };
    await client.query(
      `INSERT INTO users (id, name, email, role, "orgId", "passwordHash")
       SELECT id::uuid, name, email, 'user', $1::uuid, NULL
       FROM jsonb_to_recordset($2::jsonb) AS members(id text, name text, email text)`,
      [orgId, JSON.stringify([...members, excluded, unrelated])],
    );
    await client.query(
      `INSERT INTO academy_completion (id, "userId", "completedAt") VALUES ($1, $2, $3)`,
      [randomUUID(), excluded.id, new Date("2026-01-15T12:00:00Z")],
    );
    return { members, excluded, unrelated };
  } finally {
    await client.end();
  }
}

export type ReleaseNoteMedia =
  | { type: "image"; storageKey: string; contentType: string }
  | { type: "loom"; url: string };

/**
 * Only the hourly Announcable sync creates release-note notifications, for
 * every user at once, so specs insert them for one user directly.
 */
export async function insertReleaseNoteNotification(params: {
  userId: string;
  orgId: string;
  headline: string;
  body: string;
  media: ReleaseNoteMedia | null;
}): Promise<string> {
  const id = randomUUID();
  const { media } = params;
  const client = createDatabaseClient();
  await client.connect();
  try {
    await client.query(
      `INSERT INTO notifications
         (id, "userId", "orgId", type, headline, body,
          "mediaType", "mediaUrl", "mediaStorageKey", "mediaContentType")
       VALUES ($1, $2, $3, 'release_note', $4, $5, $6, $7, $8, $9)`,
      [
        id,
        params.userId,
        params.orgId,
        params.headline,
        params.body,
        media?.type ?? null,
        media?.type === "loom" ? media.url : null,
        media?.type === "image" ? media.storageKey : null,
        media?.type === "image" ? media.contentType : null,
      ],
    );
    return id;
  } finally {
    await client.end();
  }
}

/**
 * The release note the sync stored for an Announcable note, with how many
 * notifications it has; null while it is not stored.
 */
export async function findSyncedReleaseNote(
  announcableId: string,
): Promise<{ headline: string; notifications: number } | null> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    const result = await client.query<{
      headline: string;
      notifications: number;
    }>(
      `SELECT r.headline, COUNT(n.id)::int AS notifications
       FROM release_notes r
       LEFT JOIN notifications n ON n."releaseNoteId" = r.id
       WHERE r."announcableId" = $1
       GROUP BY r.id`,
      [announcableId],
    );
    return result.rows[0] ?? null;
  } finally {
    await client.end();
  }
}

/** The first image of a thread's first user message. */
export async function findUserMessageImage(
  threadId: string,
): Promise<{ messageId: string; contentType: string }> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    const result = await client.query<{ id: string; contentType: string }>(
      `SELECT m.id, image->>'contentType' AS "contentType"
       FROM messages m, jsonb_array_elements(m.content) AS image
       WHERE m."threadId" = $1 AND m.role = 'user'
         AND image->>'type' = 'image' AND (image->>'index')::int = 0
       ORDER BY m."createdAt"
       LIMIT 1`,
      [threadId],
    );
    const [row] = result.rows;
    if (!row) throw new Error(`Thread ${threadId} has no user message image`);
    return { messageId: row.id, contentType: row.contentType };
  } finally {
    await client.end();
  }
}

/** Invites only expire with time, so specs backdate them directly. */
export async function expireInvites(emails: string[]): Promise<void> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    const result = await client.query(
      `UPDATE invites SET "expiresAt" = now() - interval '1 day'
       WHERE email = ANY($1::text[])`,
      [emails],
    );
    if (result.rowCount !== emails.length) {
      throw new Error(`Expected to expire ${emails.length} invites`);
    }
  } finally {
    await client.end();
  }
}

export interface RecordingAudioRows {
  storageKey: string | null;
  /** The transcript segments, in order, with the speaker label apart from the text. */
  segments: { speaker: string | null; text: string; start: number; end: number }[];
  /** Search index entries of the audio's transcript. */
  indexEntries: number;
  /** Time ranges of the transcript chunks the index entries point at. */
  chunkRanges: { start: number; end: number }[];
}

/** What the database keeps of a recording's audio; null once it is gone. */
export async function findRecordingAudioRows(
  recordingId: string,
): Promise<RecordingAudioRows | null> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    const source = await client.query<{ id: string; storageKey: string | null }>(
      'SELECT id, "storageKey" FROM sources WHERE "recordingId" = $1',
      [recordingId],
    );
    const audio = source.rows[0];
    if (!audio) return null;
    const segments = await client.query<{
      speaker: string | null;
      text: string;
      start: number;
      end: number;
    }>(
      `SELECT speaker, text, "startSeconds" AS start, "endSeconds" AS "end"
       FROM source_transcript_segments WHERE "sourceId" = $1 ORDER BY position`,
      [audio.id],
    );
    const chunks = await client.query<{ start: number; end: number }>(
      `SELECT (c.meta->>'start')::float AS start, (c.meta->>'end')::float AS "end"
       FROM parent_chunks p JOIN source_content_chunks c ON c.id = p."relatedChunkId"
       WHERE p."relatedDocumentId" = $1`,
      [audio.id],
    );
    return {
      storageKey: audio.storageKey,
      segments: segments.rows,
      indexEntries: chunks.rowCount ?? 0,
      chunkRanges: chunks.rows,
    };
  } finally {
    await client.end();
  }
}

/** Rows left behind by a deleted audio source: segments and index entries. */
export async function countOrphanedAudioRows(sourceIds: string[]): Promise<number> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    const result = await client.query<{ count: string }>(
      `SELECT (SELECT COUNT(*) FROM sources WHERE id = ANY($1))
        + (SELECT COUNT(*) FROM source_transcript_segments WHERE "sourceId" = ANY($1))
        + (SELECT COUNT(*) FROM parent_chunks WHERE "relatedDocumentId" = ANY($1)) AS count`,
      [sourceIds],
    );
    return Number(result.rows[0]?.count ?? 0);
  } finally {
    await client.end();
  }
}

export async function findRecordingAudioSourceId(
  recordingId: string,
): Promise<string | null> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    const result = await client.query<{ id: string }>(
      'SELECT id FROM sources WHERE "recordingId" = $1',
      [recordingId],
    );
    return result.rows[0]?.id ?? null;
  } finally {
    await client.end();
  }
}

/** How many recording uploads the user has started in the current window. */
export async function findRecordingUploadCount(
  userId: string,
): Promise<number | null> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    const result = await client.query<{ count: number }>(
      `SELECT count FROM usage_quotas
       WHERE "userId" = $1 AND "quotaType" = 'FAIR_USE_RECORDINGS'`,
      [userId],
    );
    return result.rows[0]?.count ?? null;
  } finally {
    await client.end();
  }
}

/** Moves the user's recording upload window into the past, as if it had passed. */
export async function expireRecordingUploadWindow(
  userId: string,
): Promise<void> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    const result = await client.query(
      `UPDATE usage_quotas
       SET "windowStartAt" = "windowStartAt"
         - make_interval(secs => "windowDurationMs" / 1000.0 + 1)
       WHERE "userId" = $1 AND "quotaType" = 'FAIR_USE_RECORDINGS'`,
      [userId],
    );
    if (result.rowCount !== 1) {
      throw new Error(`No recording upload window of user ${userId}`);
    }
  } finally {
    await client.end();
  }
}
