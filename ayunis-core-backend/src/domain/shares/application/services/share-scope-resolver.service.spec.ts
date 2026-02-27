import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ShareScopeResolverService } from './share-scope-resolver.service';
import { FindAllUserIdsByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.use-case';
import { FindAllUserIdsByTeamIdUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.use-case';
import { ShareScopeType } from '../../domain/value-objects/share-scope-type.enum';
import { randomUUID } from 'crypto';

describe('ShareScopeResolverService', () => {
  let service: ShareScopeResolverService;
  let findAllUserIdsByOrgId: { execute: jest.Mock };
  let findAllUserIdsByTeamId: { execute: jest.Mock };

  beforeAll(async () => {
    findAllUserIdsByOrgId = {
      execute: jest.fn().mockResolvedValue([]),
    };

    findAllUserIdsByTeamId = {
      execute: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareScopeResolverService,
        {
          provide: FindAllUserIdsByOrgIdUseCase,
          useValue: findAllUserIdsByOrgId,
        },
        {
          provide: FindAllUserIdsByTeamIdUseCase,
          useValue: findAllUserIdsByTeamId,
        },
      ],
    }).compile();

    service = module.get<ShareScopeResolverService>(ShareScopeResolverService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty set when no scopes are provided', async () => {
    const result = await service.resolveUserIds([]);

    expect(result).toEqual(new Set());
  });

  it('should resolve user IDs from an org scope', async () => {
    const orgId = randomUUID();
    const userId1 = randomUUID();
    const userId2 = randomUUID();

    findAllUserIdsByOrgId.execute.mockResolvedValue([userId1, userId2]);

    const result = await service.resolveUserIds([
      { scopeType: ShareScopeType.ORG, scopeId: orgId },
    ]);

    expect(findAllUserIdsByOrgId.execute).toHaveBeenCalledWith({ orgId });
    expect(result).toEqual(new Set([userId1, userId2]));
  });

  it('should resolve user IDs from a team scope', async () => {
    const teamId = randomUUID();
    const userId1 = randomUUID();

    findAllUserIdsByTeamId.execute.mockResolvedValue([userId1]);

    const result = await service.resolveUserIds([
      { scopeType: ShareScopeType.TEAM, scopeId: teamId },
    ]);

    expect(findAllUserIdsByTeamId.execute).toHaveBeenCalledWith({ teamId });
    expect(result).toEqual(new Set([userId1]));
  });

  it('should merge user IDs from multiple scopes without duplicates', async () => {
    const orgId = randomUUID();
    const teamId = randomUUID();
    const sharedUserId = randomUUID();
    const orgOnlyUserId = randomUUID();
    const teamOnlyUserId = randomUUID();

    findAllUserIdsByOrgId.execute.mockResolvedValue([
      sharedUserId,
      orgOnlyUserId,
    ]);
    findAllUserIdsByTeamId.execute.mockResolvedValue([
      sharedUserId,
      teamOnlyUserId,
    ]);

    const result = await service.resolveUserIds([
      { scopeType: ShareScopeType.ORG, scopeId: orgId },
      { scopeType: ShareScopeType.TEAM, scopeId: teamId },
    ]);

    expect(result).toEqual(
      new Set([sharedUserId, orgOnlyUserId, teamOnlyUserId]),
    );
  });

  it('should return empty array for unknown scope type', async () => {
    const result = await service.resolveUserIds([
      { scopeType: 'UNKNOWN' as ShareScopeType, scopeId: randomUUID() },
    ]);

    expect(result).toEqual(new Set());
  });
});
