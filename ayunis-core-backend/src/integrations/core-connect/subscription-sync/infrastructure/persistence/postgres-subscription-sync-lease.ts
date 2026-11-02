import { SubscriptionSyncLeaseRecord } from './schema/subscription-sync-lease.record';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { UUID } from 'crypto';
import { SubscriptionSyncLease } from 'src/integrations/core-connect/subscription-sync/application/ports/subscription-sync-lease';

@Injectable()
export class PostgresSubscriptionSyncLease extends SubscriptionSyncLease {
  constructor(private readonly db: DataSource) {
    super();
  }
  private get table(): string {
    const metadata = this.db.getMetadata(SubscriptionSyncLeaseRecord);
    const escape = (name: string) => this.db.driver.escape(name);
    return metadata.schema
      ? `${escape(metadata.schema)}.${escape(metadata.tableName)}`
      : escape(metadata.tableName);
  }
  async acquire(ownerId: UUID): Promise<boolean> {
    const rows: unknown[] = await this.db.query(
      `
      INSERT INTO ${this.table} ("name", "ownerId", "expiresAt")
      VALUES ('reconciliation', $1, CURRENT_TIMESTAMP + INTERVAL '2 minutes')
      ON CONFLICT ("name") DO UPDATE SET "ownerId" = EXCLUDED."ownerId", "expiresAt" = EXCLUDED."expiresAt"
      WHERE "subscription_sync_leases"."expiresAt" <= CURRENT_TIMESTAMP OR "subscription_sync_leases"."ownerId" = $1
      RETURNING "ownerId"
    `,
      [ownerId],
    );
    return rows.length === 1;
  }
  async release(ownerId: UUID): Promise<void> {
    await this.db.query(
      `DELETE FROM ${this.table} WHERE "name" = $1 AND "ownerId" = $2`,
      ['reconciliation', ownerId],
    );
  }
}
