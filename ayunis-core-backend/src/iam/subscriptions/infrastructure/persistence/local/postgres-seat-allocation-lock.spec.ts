import type { EntityManager } from 'typeorm';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { PostgresSeatAllocationLock } from 'src/iam/subscriptions/infrastructure/persistence/local/postgres-seat-allocation-lock';

const ORG_ID = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4' as UUID;

describe(PostgresSeatAllocationLock.name, () => {
  it('takes a transaction-scoped advisory lock for the organization', async () => {
    const manager = { query: jest.fn() } as unknown as EntityManager;
    const lock = new PostgresSeatAllocationLock({
      tx: manager,
    } as TransactionHost<TransactionalAdapterTypeOrm>);

    await lock.acquire(ORG_ID);

    expect(manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [ORG_ID],
    );
  });
});
