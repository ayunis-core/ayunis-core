/* eslint-disable sonarjs/no-hardcoded-ip -- test fixtures require hardcoded IPs */
import { UpdateIpAllowlistUseCase } from './update-ip-allowlist.use-case';
import { UpdateIpAllowlistCommand } from './update-ip-allowlist.command';
import type { IpAllowlistRepository } from '../../ports/ip-allowlist.repository';
import { IpAllowlist } from '../../../domain/ip-allowlist.entity';
import {
  AdminLockoutError,
  InvalidCidrApplicationError,
  UnexpectedIpAllowlistError,
} from '../../ip-allowlist.errors';
import type { UUID } from 'crypto';

describe('UpdateIpAllowlistUseCase', () => {
  let useCase: UpdateIpAllowlistUseCase;
  let repository: jest.Mocked<IpAllowlistRepository>;

  const orgId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' as UUID;
  const adminIp = '192.168.1.50';

  beforeEach(() => {
    repository = {
      findByOrgId: jest.fn(),
      upsert: jest.fn(),
      deleteByOrgId: jest.fn(),
    } as jest.Mocked<IpAllowlistRepository>;

    repository.upsert.mockImplementation(async (entity) => entity);
    repository.findByOrgId.mockResolvedValue(null);

    useCase = new UpdateIpAllowlistUseCase(repository);
  });

  it('should save valid CIDRs when admin IP is within the new allow list', async () => {
    const command = new UpdateIpAllowlistCommand(
      orgId,
      ['192.168.1.0/24', '10.0.0.0/8'],
      adminIp,
    );

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(IpAllowlist);
    expect(result?.cidrs).toEqual(['192.168.1.0/24', '10.0.0.0/8']);
    expect(repository.upsert).toHaveBeenCalledTimes(1);
  });

  it('should preserve the existing entity ID when updating', async () => {
    const existingId = 'e1e2e3e4-e5e6-7890-abcd-ef1234567890' as UUID;
    const existing = new IpAllowlist({
      id: existingId,
      orgId,
      cidrs: ['10.0.0.0/8'],
    });
    repository.findByOrgId.mockResolvedValue(existing);

    const command = new UpdateIpAllowlistCommand(
      orgId,
      ['192.168.1.0/24'],
      adminIp,
    );

    const result = await useCase.execute(command);

    expect(result?.id).toBe(existingId);
    expect(repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: existingId }),
    );
  });

  it('should preserve createdAt when updating an existing allow list', async () => {
    const existingId = 'e1e2e3e4-e5e6-7890-abcd-ef1234567890' as UUID;
    const originalCreatedAt = new Date('2024-01-01T00:00:00Z');
    const existing = new IpAllowlist({
      id: existingId,
      orgId,
      cidrs: ['10.0.0.0/8'],
      createdAt: originalCreatedAt,
    });
    repository.findByOrgId.mockResolvedValue(existing);

    const command = new UpdateIpAllowlistCommand(
      orgId,
      ['192.168.1.0/24'],
      adminIp,
    );

    const result = await useCase.execute(command);

    expect(result?.createdAt).toBe(originalCreatedAt);
    expect(repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ createdAt: originalCreatedAt }),
    );
  });

  it('should throw AdminLockoutError when admin IP is not in the new allow list', async () => {
    const command = new UpdateIpAllowlistCommand(
      orgId,
      ['10.0.0.0/8'],
      adminIp, // 192.168.1.50 is not in 10.0.0.0/8
    );

    await expect(useCase.execute(command)).rejects.toThrow(AdminLockoutError);
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('should throw InvalidCidrApplicationError when a CIDR is malformed', async () => {
    const command = new UpdateIpAllowlistCommand(
      orgId,
      ['192.168.1.0/24', 'not-a-cidr'],
      adminIp,
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      InvalidCidrApplicationError,
    );
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('should throw InvalidCidrApplicationError before AdminLockoutError for invalid CIDRs', async () => {
    const command = new UpdateIpAllowlistCommand(
      orgId,
      ['not-a-cidr'],
      adminIp,
    );

    // Even though the admin IP can't match, validation should fail first
    await expect(useCase.execute(command)).rejects.toThrow(
      InvalidCidrApplicationError,
    );
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('should save valid IPv6 CIDRs when admin IPv6 IP is within the new allow list', async () => {
    const command = new UpdateIpAllowlistCommand(
      orgId,
      ['2001:db8::/32'],
      '2001:db8::1',
    );

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(IpAllowlist);
    expect(result?.cidrs).toEqual(['2001:db8::/32']);
    expect(repository.upsert).toHaveBeenCalledTimes(1);
  });

  it('should throw AdminLockoutError when admin IPv6 IP is not in the new IPv6 allow list', async () => {
    const command = new UpdateIpAllowlistCommand(
      orgId,
      ['2001:db8::/32'],
      'fd00::1', // not in 2001:db8::/32
    );

    await expect(useCase.execute(command)).rejects.toThrow(AdminLockoutError);
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('should throw UnexpectedIpAllowlistError when repository throws unexpected error', async () => {
    repository.findByOrgId.mockRejectedValue(new Error('DB connection lost'));

    const command = new UpdateIpAllowlistCommand(
      orgId,
      ['192.168.1.0/24'],
      adminIp,
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      UnexpectedIpAllowlistError,
    );
  });
});
