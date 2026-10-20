import { Client } from 'pg';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config';

function databasePort(): number {
  if (process.env.E2E_POSTGRES_PORT) {
    return Number(process.env.E2E_POSTGRES_PORT);
  }
  const apiPort = Number(new URL(config.apiURL).port || '3000');
  return 5432 + (apiPort - 3000);
}

function createDatabaseClient(): Client {
  return new Client({
    host: process.env.E2E_POSTGRES_HOST ?? 'localhost',
    port: databasePort(),
    user: process.env.E2E_POSTGRES_USER ?? 'postgres',
    password: process.env.E2E_POSTGRES_PASSWORD ?? 'postgres',
    database: process.env.E2E_POSTGRES_DB ?? 'ayunis',
  });
}

export async function setSubscriptionAccessEnd(
  subscriptionId: string,
  accessEndsAt: Date | null,
): Promise<void> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    const result = await client.query(
      'UPDATE subscriptions SET "accessEndsAt" = $1 WHERE id = $2',
      [accessEndsAt, subscriptionId],
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

export async function setLegacyAcademyAccountCreatedAt(
  orgId: string,
  userId: string,
): Promise<void> {
  const client = createDatabaseClient();
  await client.connect();
  try {
    const result = await client.query(
      `UPDATE users SET "createdAt" = TIMESTAMP '2026-10-01 00:00:00'
       WHERE id = $1 AND "orgId" = $2`,
      [userId, orgId],
    );
    if (result.rowCount !== 1) throw new Error('Legacy user was not updated');
  } finally {
    await client.end();
  }
}

export async function backfillAcademyForTestOrg(orgId: string): Promise<number> {
  const sql = readFileSync(
    path.resolve(
      process.cwd(),
      '../ayunis-core-backend/src/db/scripts/backfill-nidda-academy.sql',
    ),
    'utf8',
  );
  // Worker orgs are generated per run; exercise the repair without targeting
  // the real customer. The PostgreSQL integration spec verifies the literal ID.
  const testSql = sql.replace(
    "'64dc46da-a9b8-4510-b666-1c0c9b6d9517'",
    '$1',
  );
  const client = createDatabaseClient();
  await client.connect();
  try {
    const result = await client.query(testSql, [orgId]);
    return result.rowCount ?? 0;
  } finally {
    await client.end();
  }
}
