import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { Repository } from 'typeorm';
import { LocalMfaRecoveryCodesRepository } from 'src/iam/mfa/infrastructure/repositories/local/local-mfa-recovery-codes.repository';
import type { MfaRecoveryCodeRecord } from 'src/iam/mfa/infrastructure/repositories/local/schema/mfa-recovery-code.record';
import { MfaRecoveryCode } from 'src/iam/mfa/domain/mfa-recovery-code.entity';

describe(LocalMfaRecoveryCodesRepository.name, () => {
  it('replaces codes within the ambient transaction', async () => {
    const records = {
      delete: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<MfaRecoveryCodeRecord>>;
    const withTransaction = jest.fn(async (callback) => callback());
    const txHost = {
      tx: { getRepository: jest.fn().mockReturnValue(records) },
      withTransaction,
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>;
    const repository = new LocalMfaRecoveryCodesRepository(txHost);
    const code = new MfaRecoveryCode({
      userId: '22222222-2222-2222-2222-222222222222',
      codeHash: 'hash',
    });

    await repository.replaceForUser(code.userId, [code]);

    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(records.delete).toHaveBeenCalledWith({ userId: code.userId });
    expect(records.save).toHaveBeenCalledWith([
      expect.objectContaining({ userId: code.userId, codeHash: 'hash' }),
    ]);
  });
});
