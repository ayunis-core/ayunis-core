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

export type WorkspaceRole = "admin" | "manager" | "user";

/**
 * No API adds workspace members yet, so specs insert membership rows
 * directly. `joinedAt` orders members by how long they have belonged.
 */
export async function addWorkspaceMember(params: {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
}): Promise<void> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    await client.query(
      `INSERT INTO workspace_members
         (id, "createdAt", "updatedAt", "workspaceId", "userId", role)
       VALUES ($1, $2, $2, $3, $4, $5)`,
      [
        randomUUID(),
        params.joinedAt,
        params.workspaceId,
        params.userId,
        params.role,
      ],
    );
  } finally {
    await client.end();
  }
}

export async function findWorkspaceMemberRoles(
  workspaceId: string,
): Promise<Record<string, WorkspaceRole>> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    const result = await client.query<{ userId: string; role: WorkspaceRole }>(
      `SELECT "userId", role FROM workspace_members WHERE "workspaceId" = $1`,
      [workspaceId],
    );
    return Object.fromEntries(
      result.rows.map((row) => [row.userId, row.role]),
    );
  } finally {
    await client.end();
  }
}

export async function countWorkspaceRows(workspaceId: string): Promise<{
  workspaces: number;
  skills: number;
  knowledgeBases: number;
}> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    const result = await client.query<{
      workspaces: number;
      skills: number;
      knowledgeBases: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM workspaces WHERE id = $1) AS workspaces,
         (SELECT COUNT(*)::int FROM skills WHERE "workspaceId" = $1) AS skills,
         (SELECT COUNT(*)::int FROM knowledge_bases WHERE "workspaceId" = $1)
           AS "knowledgeBases"`,
      [workspaceId],
    );
    const [row] = result.rows;
    if (!row) throw new Error(`Could not count rows of ${workspaceId}`);
    return row;
  } finally {
    await client.end();
  }
}
