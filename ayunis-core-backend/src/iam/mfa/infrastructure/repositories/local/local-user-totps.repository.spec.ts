import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { Repository } from 'typeorm';
import { LocalUserTotpsRepository } from 'src/iam/mfa/infrastructure/repositories/local/local-user-totps.repository';
import type { UserTotpRecord } from 'src/iam/mfa/infrastructure/repositories/local/schema/user-totp.record';
import { UserTotp } from 'src/iam/mfa/domain/user-totp.entity';

describe(LocalUserTotpsRepository.name, () => {
  it('reads and writes through the ambient transaction', async () => {
    const totp = new UserTotp({
      userId: '22222222-2222-2222-2222-222222222222',
      encryptedSecret: 'encrypted-secret',
    });
    const record = expect.objectContaining({ userId: totp.userId });
    const records = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (value) => value),
    } as unknown as jest.Mocked<Repository<UserTotpRecord>>;
    const repository = new LocalUserTotpsRepository(txHost(records));

    await repository.findByUserId(totp.userId);
    await repository.upsert(totp);

    expect(records.findOne).toHaveBeenCalledWith({
      where: { userId: totp.userId },
    });
    expect(records.save).toHaveBeenCalledWith(record);
  });
});

function txHost(
  records: Repository<UserTotpRecord>,
): TransactionHost<TransactionalAdapterTypeOrm> {
  return {
    tx: { getRepository: jest.fn().mockReturnValue(records) },
  } as unknown as TransactionHost<TransactionalAdapterTypeOrm>;
}
