import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { serialize, deserialize } from 'node:v8';
import type { PendingDomainEvent } from 'src/common/events/pending-domain-event';
import {
  ExternalSubscriptionOutbox,
  type ExternalSubscriptionOutboxEntry,
} from 'src/integrations/external-subscriptions/application/ports/external-subscription-outbox';
import { ExternalSubscriptionOutboxRecord } from './schema/external-subscription-outbox.record';

@Injectable()
export class PostgresExternalSubscriptionOutbox extends ExternalSubscriptionOutbox {
  constructor(
    private readonly host: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  async append(orgId: UUID, events: PendingDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.host.tx
        .getRepository(ExternalSubscriptionOutboxRecord)
        .insert({
          id: randomUUID(),
          orgId,
          eventName: event.name,
          payload: serialize(event.event),
        });
    }
  }

  async claim(): Promise<ExternalSubscriptionOutboxEntry | null> {
    // Claim only the oldest event for an org. A failed delivery blocks later
    // events for that org; the lease recovers work after process termination.
    const table = this.host.tx
      .getRepository(ExternalSubscriptionOutboxRecord)
      .metadata.tablePath.split('.')
      .map((part) => this.host.tx.connection.driver.escape(part))
      .join('.');
    const rows: Array<ExternalSubscriptionOutboxRecord & { claimToken: UUID }> =
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
            event: deserialize(row.payload) as object,
          },
        }
      : null;
  }

  async complete(id: UUID, claimToken: UUID): Promise<void> {
    await this.host.tx
      .getRepository(ExternalSubscriptionOutboxRecord)
      .delete({ id, claimToken });
  }

  async retry(id: UUID, claimToken: UUID): Promise<void> {
    await this.host.tx.getRepository(ExternalSubscriptionOutboxRecord).update(
      { id, claimToken },
      {
        availableAt: new Date(Date.now() + 60_000),
      },
    );
  }
}
