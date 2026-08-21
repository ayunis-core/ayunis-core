import { SsoLoginTransaction } from 'src/iam/sso/domain/sso-login-transaction.entity';
import { PostgresSsoLoginTransactionsRepository } from 'src/iam/sso/infrastructure/persistence/postgres/sso-login-transactions.repository';
import { SsoLoginTransactionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/sso-login-transaction.record';
import type { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

describe('PostgresSsoLoginTransactionsRepository', () => {
  it('consumes an unexpired transaction under a write lock', async () => {
    const transaction = buildTransaction();
    const record = new SsoLoginTransactionRecord();
    Object.assign(record, transaction);
    const lockedRepository = {
      findOne: jest.fn().mockResolvedValue(record),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const repository = buildRepository(lockedRepository);
    const consumedAt = new Date('2026-08-12T10:01:00.000Z');

    const result = await repository.consume(
      transaction.stateHash,
      transaction.browserBindingHash,
      consumedAt,
    );

    expect(lockedRepository.findOne).toHaveBeenCalledWith({
      where: {
        stateHash: transaction.stateHash,
        browserBindingHash: transaction.browserBindingHash,
        consumedAt: expect.anything(),
        expiresAt: expect.anything(),
      },
      lock: { mode: 'pessimistic_write' },
    });
    const where = lockedRepository.findOne.mock.calls[0][0]?.where as {
      expiresAt: { _type: string; _value: Date };
    };
    expect(where.expiresAt._type).toBe('moreThan');
    expect(where.expiresAt._value).toEqual(consumedAt);
    expect(result?.consumedAt).toEqual(consumedAt);
  });

  it('returns null when the transaction was already consumed or expired', async () => {
    const lockedRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    const repository = buildRepository(lockedRepository);

    await expect(
      repository.consume('a'.repeat(64), 'b'.repeat(64), new Date()),
    ).resolves.toBeNull();
    expect(lockedRepository.save).not.toHaveBeenCalled();
  });

  it('deletes expired transactions', async () => {
    const typeOrmRepository = {
      delete: jest.fn().mockResolvedValue({ affected: 3 }),
    } as unknown as Repository<SsoLoginTransactionRecord>;
    const repository = new PostgresSsoLoginTransactionsRepository(
      typeOrmRepository,
    );
    const now = new Date('2026-08-13T05:00:00.000Z');

    await expect(repository.deleteExpired(now)).resolves.toBe(3);
    expect(typeOrmRepository.delete).toHaveBeenCalledWith({
      expiresAt: expect.anything(),
    });
  });
});

function buildTransaction(): SsoLoginTransaction {
  return new SsoLoginTransaction({
    stateHash: 'a'.repeat(64),
    browserBindingHash: 'b'.repeat(64),
    postLoginPath: '/',
    encryptedCodeVerifier: 'encrypted-verifier',
    encryptedNonce: 'encrypted-nonce',
    orgId: randomUUID(),
    zitadelOrgId: '385820595704561666',
    expiresAt: new Date('2026-08-12T10:10:00.000Z'),
  });
}

function buildRepository(
  lockedRepository: Pick<
    Repository<SsoLoginTransactionRecord>,
    'findOne' | 'save'
  >,
): PostgresSsoLoginTransactionsRepository {
  const typeOrmRepository = {
    manager: {
      transaction: jest.fn(async (operation) =>
        operation({ getRepository: () => lockedRepository }),
      ),
    },
  } as unknown as Repository<SsoLoginTransactionRecord>;
  return new PostgresSsoLoginTransactionsRepository(typeOrmRepository);
}
