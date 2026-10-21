import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { serialize, deserialize } from 'node:v8';
import type { PendingDomainEvent } from 'src/common/events/pending-domain-event';
import {
  FynnOutbox,
  type FynnOutboxEntry,
} from 'src/integrations/fynn/application/ports/fynn-outbox';
import { FynnOutboxRecord } from './schema/fynn-outbox.record';

@Injectable()
export class PostgresFynnOutbox extends FynnOutbox {
  constructor(
    private readonly host: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  async append(orgId: UUID, events: PendingDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.host.tx.getRepository(FynnOutboxRecord).insert({
        id: randomUUID(),
        orgId,
        eventName: event.name,
        payload: serialize(event.event),
      });
    }
  }

  async claim(): Promise<FynnOutboxEntry | null> {
    // Claim only the oldest event for an org. A failed delivery blocks later
    // events for that org; the lease recovers work after process termination.
    const table = this.host.tx
      .getRepository(FynnOutboxRecord)
      .metadata.tablePath.split('.')
      .map((part) => this.host.tx.connection.driver.escape(part))
      .join('.');
    const rows: Array<FynnOutboxRecord & { claimToken: UUID }> =
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
      .getRepository(FynnOutboxRecord)
      .delete({ id, claimToken });
  }

  async retry(id: UUID, claimToken: UUID): Promise<void> {
    await this.host.tx.getRepository(FynnOutboxRecord).update(
      { id, claimToken },
      {
        availableAt: new Date(Date.now() + 60_000),
      },
    );
  }
}
