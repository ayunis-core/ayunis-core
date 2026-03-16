import { DeleteIpAllowlistUseCase } from './delete-ip-allowlist.use-case';
import { DeleteIpAllowlistCommand } from './delete-ip-allowlist.command';
import type { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
import type { UUID } from 'crypto';

describe('DeleteIpAllowlistUseCase', () => {
  let useCase: DeleteIpAllowlistUseCase;
  let repository: jest.Mocked<IpAllowlistRepository>;

  const orgId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' as UUID;

  beforeEach(() => {
    repository = {
      findByOrgId: jest.fn(),
      upsert: jest.fn(),
      deleteByOrgId: jest.fn(),
    } as jest.Mocked<IpAllowlistRepository>;

    useCase = new DeleteIpAllowlistUseCase(repository);
  });

  it('should delete the allow list for the given org', async () => {
    await useCase.execute(new DeleteIpAllowlistCommand(orgId));

    expect(repository.deleteByOrgId).toHaveBeenCalledWith(orgId);
    expect(repository.deleteByOrgId).toHaveBeenCalledTimes(1);
  });

  it('should not throw when no allow list exists for the org', async () => {
    repository.deleteByOrgId.mockResolvedValue(undefined);

    await expect(
      useCase.execute(new DeleteIpAllowlistCommand(orgId)),
    ).resolves.not.toThrow();
  });
});
