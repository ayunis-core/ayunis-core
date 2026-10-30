import { ExternalSubscriptionLeaseRecord } from './schema/external-subscription-lease.record';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { UUID } from 'crypto';
import { ExternalSubscriptionLease } from 'src/integrations/external-subscriptions/application/ports/external-subscription-lease';

@Injectable()
export class PostgresExternalSubscriptionLease extends ExternalSubscriptionLease {
  constructor(private readonly db: DataSource) {
    super();
  }
  private get table(): string {
    const metadata = this.db.getMetadata(ExternalSubscriptionLeaseRecord);
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
      WHERE "external_subscription_leases"."expiresAt" <= CURRENT_TIMESTAMP OR "external_subscription_leases"."ownerId" = $1
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
