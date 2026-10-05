jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (
      _target: object,
      _propertyName: string | symbol,
      descriptor: PropertyDescriptor,
    ) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import { OrgNotFoundError } from 'src/iam/orgs/application/orgs.errors';
import type { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { AdmitOrgProcessingQuery } from './admit-org-processing.query';
import { AdmitOrgProcessingUseCase } from './admit-org-processing.use-case';

describe('AdmitOrgProcessingUseCase', () => {
  const orgId = randomUUID();
  const orgs = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<OrgsRepository>;
  const useCase = new AdmitOrgProcessingUseCase(orgs);

  beforeEach(() => jest.clearAllMocks());

  it('admits an existing organisation under a lifecycle read lock', async () => {
    orgs.findById.mockResolvedValue({ archived: true } as never);

    await expect(
      useCase.execute(new AdmitOrgProcessingQuery(orgId)),
    ).resolves.toBe(true);

    expect(orgs.findById).toHaveBeenCalledWith(orgId, true);
  });

  it('declines a job whose organisation was deleted', async () => {
    orgs.findById.mockRejectedValue(new OrgNotFoundError(orgId));

    await expect(
      useCase.execute(new AdmitOrgProcessingQuery(orgId)),
    ).resolves.toBe(false);
  });

  it('propagates infrastructure failures', async () => {
    orgs.findById.mockRejectedValue(new Error('database unavailable'));

    await expect(
      useCase.execute(new AdmitOrgProcessingQuery(orgId)),
    ).rejects.toThrow('database unavailable');
  });
});
