import type { UUID } from 'crypto';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { OrgErrorCode } from 'src/iam/orgs/application/orgs.errors';
import { AssertOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-org-active/assert-org-active.use-case';
import { LocalOrgsRepository } from './local-orgs.repository';

describe('LocalOrgsRepository.findById error classification', () => {
  const orgId = '11111111-1111-4111-8111-111111111111' as UUID;
  const records = { findOne: jest.fn() };
  const txHost = {
    tx: { getRepository: () => records },
  } as unknown as TransactionHost<TransactionalAdapterTypeOrm>;
  const repository = new LocalOrgsRepository(txHost);
  const access = new AssertOrgActiveUseCase(repository);

  it.each([
    [false, 'connection failed'],
    [true, 'lock timeout'],
    [true, 'deadlock'],
  ] as const)(
    'reports query failure as a server error (locked: %s, %s)',
    async (lockForLifecycle, reason) => {
      records.findOne.mockRejectedValue(new Error(reason));
      await expect(
        access.execute({ orgId, lockForLifecycle }),
      ).rejects.toMatchObject({
        code: OrgErrorCode.ORG_RETRIEVAL_FAILED,
        statusCode: 500,
      });
    },
  );

  it('still denies access when the organisation does not exist', async () => {
    records.findOne.mockResolvedValue(null);
    await expect(access.execute({ orgId })).rejects.toMatchObject({
      code: OrgErrorCode.ORG_NOT_ACTIVE,
      statusCode: 401,
    });
  });
});
