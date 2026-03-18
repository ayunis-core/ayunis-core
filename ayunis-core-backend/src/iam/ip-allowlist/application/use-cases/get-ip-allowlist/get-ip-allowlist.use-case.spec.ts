/* eslint-disable sonarjs/no-hardcoded-ip -- test fixtures require hardcoded IPs */
import { GetIpAllowlistUseCase } from './get-ip-allowlist.use-case';
import { GetIpAllowlistQuery } from './get-ip-allowlist.query';
import type { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
import { UnexpectedIpAllowlistError } from '../../ip-allowlist.errors';
import { IpAllowlist } from '../../../domain/ip-allowlist.entity';
import type { UUID } from 'crypto';

describe('GetIpAllowlistUseCase', () => {
  let useCase: GetIpAllowlistUseCase;
  let repository: jest.Mocked<IpAllowlistRepository>;

  const orgId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' as UUID;

  beforeEach(() => {
    repository = {
      findByOrgId: jest.fn(),
      upsert: jest.fn(),
      deleteByOrgId: jest.fn(),
    } as jest.Mocked<IpAllowlistRepository>;

    useCase = new GetIpAllowlistUseCase(repository);
  });

  it('should return the allow list when one exists for the org', async () => {
    const allowlist = new IpAllowlist({
      orgId,
      cidrs: ['10.0.0.0/8'],
    });
    repository.findByOrgId.mockResolvedValue(allowlist);

    const result = await useCase.execute(new GetIpAllowlistQuery(orgId));

    expect(result).toBe(allowlist);
    expect(repository.findByOrgId).toHaveBeenCalledWith(orgId);
  });

  it('should return null when no allow list exists for the org', async () => {
    repository.findByOrgId.mockResolvedValue(null);

    const result = await useCase.execute(new GetIpAllowlistQuery(orgId));

    expect(result).toBeNull();
  });

  it('should throw UnexpectedIpAllowlistError when repository throws unexpected error', async () => {
    repository.findByOrgId.mockRejectedValue(new Error('DB connection lost'));

    await expect(
      useCase.execute(new GetIpAllowlistQuery(orgId)),
    ).rejects.toThrow(UnexpectedIpAllowlistError);
  });
});
