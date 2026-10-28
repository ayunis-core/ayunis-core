import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { PostgresSsoProvisioningLock } from 'src/iam/sso/infrastructure/persistence/postgres/postgres-sso-provisioning-lock';

describe(PostgresSsoProvisioningLock.name, () => {
  it('uses distinct transaction-scoped advisory locks for identity and email', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const lock = new PostgresSsoProvisioningLock({
      tx: { query },
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>);

    await lock.acquireIdentity('https://sso.ayunis.de', 'subject');
    await lock.acquireEmail('Staff@Stadt.Example');

    expect(query).toHaveBeenNthCalledWith(
      1,
      'SELECT pg_advisory_xact_lock(hashtextextended($1, $2))',
      ['["https://sso.ayunis.de","subject"]', 1],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      'SELECT pg_advisory_xact_lock(hashtextextended($1, $2))',
      ['staff@stadt.example', 2],
    );
  });
});
