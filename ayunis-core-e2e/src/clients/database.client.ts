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
 * Nothing in the product creates release-note notifications until the
 * Announcable sync (AYC-1686, AYC-1687), so specs insert them directly.
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
