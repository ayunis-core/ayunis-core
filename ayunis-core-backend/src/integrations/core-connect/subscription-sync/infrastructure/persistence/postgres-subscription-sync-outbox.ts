import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { serialize, deserialize } from 'node:v8';
import type { PendingBillingEvent } from 'src/integrations/webhooks/application/events/pending-billing-event';
import {
  SubscriptionSyncOutbox,
  type SubscriptionSyncOutboxEntry,
} from 'src/integrations/core-connect/subscription-sync/application/ports/subscription-sync-outbox';
import { SubscriptionSyncOutboxRecord } from './schema/subscription-sync-outbox.record';

@Injectable()
export class PostgresSubscriptionSyncOutbox extends SubscriptionSyncOutbox {
  constructor(
    private readonly host: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  async append(orgId: UUID, events: PendingBillingEvent[]): Promise<void> {
    for (const event of events) {
      await this.host.tx.getRepository(SubscriptionSyncOutboxRecord).insert({
        id: randomUUID(),
        orgId,
        eventName: event.name,
        payload: serialize(event.event),
      });
    }
  }

  async claim(): Promise<SubscriptionSyncOutboxEntry | null> {
    // Claim only the oldest event for an org. A failed delivery blocks later
    // events for that org; the lease recovers work after process termination.
    const table = this.host.tx
      .getRepository(SubscriptionSyncOutboxRecord)
      .metadata.tablePath.split('.')
      .map((part) => this.host.tx.connection.driver.escape(part))
      .join('.');
    const rows: Array<SubscriptionSyncOutboxRecord & { claimToken: UUID }> =
      await this.host.tx.query(
        `
      WITH claimed AS (
      UPDATE ${table} SET "availableAt" = CURRENT_TIMESTAMP + interval '2 minutes', "claimToken" = $1
      WHERE id = (SELECT candidate.id FROM ${table} candidate
        WHERE candidate."availableAt" <= CURRENT_TIMESTAMP
          AND NOT EXISTS (SELECT 1 FROM ${table} earlier
            WHERE earlier."orgId" = candidate."orgId" AND earlier.sequence < candidate.sequence)
        ORDER BY candidate.sequence LIMIT 1 FOR UPDATE SKIP LOCKED)
      RETURNING *) SELECT * FROM claimed`,
        [randomUUID()],
      );
    const row = rows.at(0);
    return row
      ? {
          id: row.id,
          claimToken: row.claimToken,
          createdAt: row.createdAt,
          orgId: row.orgId,
          pending: {
            name: row.eventName,
            event: decodeEvent(row.payload),
          },
        }
      : null;
  }

  async complete(id: UUID, claimToken: UUID): Promise<void> {
    await this.host.tx
      .getRepository(SubscriptionSyncOutboxRecord)
      .delete({ id, claimToken });
  }

  async retry(id: UUID, claimToken: UUID): Promise<void> {
    await this.host.tx.getRepository(SubscriptionSyncOutboxRecord).update(
      { id, claimToken },
      {
        availableAt: new Date(Date.now() + 60_000),
      },
    );
  }
}

function decodeEvent(payload: Buffer): unknown {
  try {
    return deserialize(payload) as unknown;
  } catch {
    // Retain claim metadata so corrupt bytes enter the delivery failure path.
    return undefined;
  }
}
