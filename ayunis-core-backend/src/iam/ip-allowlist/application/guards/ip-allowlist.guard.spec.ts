/* eslint-disable sonarjs/no-hardcoded-ip -- test fixtures require hardcoded IPs */
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IpAllowlistGuard } from './ip-allowlist.guard';
import type { IpAllowlistRepository } from '../ports/ip-allowlist.repository';
import { IpAllowlist } from '../../domain/ip-allowlist.entity';
import { IpNotAllowedError } from '../ip-allowlist.errors';
import type { UUID } from 'crypto';
import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';

function createMockContext(overrides: {
  isPublic?: boolean;
  user?: Partial<ActiveUser>;
  ip?: string | null;
}): { context: ExecutionContext; reflector: Reflector } {
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockReturnValue(overrides.isPublic ?? false);

  const request = {
    user: overrides.user,
    headers: overrides.ip ? { 'x-forwarded-for': overrides.ip } : {},
    socket: { remoteAddress: overrides.ip ?? undefined },
    ip: overrides.ip ?? undefined,
  };

  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;

  return { context, reflector };
}

describe('IpAllowlistGuard', () => {
  let repository: jest.Mocked<IpAllowlistRepository>;

  const orgId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' as UUID;

  const activeUser: Partial<ActiveUser> = {
    id: '11111111-2222-3333-4444-555555555555' as UUID,
    orgId,
    email: 'admin@example.gov',
  };

  beforeEach(() => {
    repository = {
      findByOrgId: jest.fn(),
      upsert: jest.fn(),
      deleteByOrgId: jest.fn(),
    } as jest.Mocked<IpAllowlistRepository>;

    repository.findByOrgId.mockResolvedValue(null);
  });

  it('should allow access on public routes without checking the allow list', async () => {
    const { context, reflector: mockReflector } = createMockContext({
      isPublic: true,
    });
    const publicGuard = new IpAllowlistGuard(mockReflector, repository);

    const result = await publicGuard.canActivate(context);

    expect(result).toBe(true);
    expect(repository.findByOrgId).not.toHaveBeenCalled();
  });

  it('should allow access when no user is present on the request', async () => {
    const { context, reflector: mockReflector } = createMockContext({
      user: undefined,
      ip: '192.168.1.50',
    });
    const noUserGuard = new IpAllowlistGuard(mockReflector, repository);

    const result = await noUserGuard.canActivate(context);

    expect(result).toBe(true);
    expect(repository.findByOrgId).not.toHaveBeenCalled();
  });

  it('should allow access when no allow list exists for the org', async () => {
    repository.findByOrgId.mockResolvedValue(null);
    const { context, reflector: mockReflector } = createMockContext({
      user: activeUser,
      ip: '192.168.1.50',
    });
    const g = new IpAllowlistGuard(mockReflector, repository);

    const result = await g.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow access when the client IP is within an allowed CIDR range', async () => {
    repository.findByOrgId.mockResolvedValue(
      new IpAllowlist({ orgId, cidrs: ['192.168.1.0/24'] }),
    );
    const { context, reflector: mockReflector } = createMockContext({
      user: activeUser,
      ip: '192.168.1.50',
    });
    const g = new IpAllowlistGuard(mockReflector, repository);

    const result = await g.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw IpNotAllowedError when the client IP is outside all allowed CIDR ranges', async () => {
    repository.findByOrgId.mockResolvedValue(
      new IpAllowlist({ orgId, cidrs: ['10.0.0.0/8'] }),
    );
    const { context, reflector: mockReflector } = createMockContext({
      user: activeUser,
      ip: '192.168.1.50',
    });
    const g = new IpAllowlistGuard(mockReflector, repository);

    await expect(g.canActivate(context)).rejects.toThrow(IpNotAllowedError);
  });

  it('should throw IpNotAllowedError when the client IP cannot be determined', async () => {
    repository.findByOrgId.mockResolvedValue(
      new IpAllowlist({ orgId, cidrs: ['10.0.0.0/8'] }),
    );
    const { context, reflector: mockReflector } = createMockContext({
      user: activeUser,
      ip: null,
    });
    const g = new IpAllowlistGuard(mockReflector, repository);

    await expect(g.canActivate(context)).rejects.toThrow(IpNotAllowedError);
  });

  it('should use cached CIDRs on subsequent requests for the same org', async () => {
    repository.findByOrgId.mockResolvedValue(
      new IpAllowlist({ orgId, cidrs: ['192.168.1.0/24'] }),
    );
    const { context, reflector: mockReflector } = createMockContext({
      user: activeUser,
      ip: '192.168.1.50',
    });
    const g = new IpAllowlistGuard(mockReflector, repository);

    await g.canActivate(context);
    await g.canActivate(context);

    expect(repository.findByOrgId).toHaveBeenCalledTimes(1);
  });

  it('should fetch from the repository after cache is invalidated', async () => {
    repository.findByOrgId.mockResolvedValue(
      new IpAllowlist({ orgId, cidrs: ['192.168.1.0/24'] }),
    );
    const { context, reflector: mockReflector } = createMockContext({
      user: activeUser,
      ip: '192.168.1.50',
    });
    const g = new IpAllowlistGuard(mockReflector, repository);

    await g.canActivate(context);
    expect(repository.findByOrgId).toHaveBeenCalledTimes(1);

    g.invalidateCache(orgId);

    await g.canActivate(context);
    expect(repository.findByOrgId).toHaveBeenCalledTimes(2);
  });

  it('should cache the absence of an allow list to avoid repeated DB queries', async () => {
    repository.findByOrgId.mockResolvedValue(null);
    const { context, reflector: mockReflector } = createMockContext({
      user: activeUser,
      ip: '192.168.1.50',
    });
    const g = new IpAllowlistGuard(mockReflector, repository);

    await g.canActivate(context);
    await g.canActivate(context);

    expect(repository.findByOrgId).toHaveBeenCalledTimes(1);
  });
});
