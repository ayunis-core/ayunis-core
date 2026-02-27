import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ShareScopeResolverService } from './share-scope-resolver.service';
import { FindAllUserIdsByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.use-case';
import { FindAllUserIdsByTeamIdUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.use-case';
import { ShareScopeType } from '../../domain/value-objects/share-scope-type.enum';
import { SharedEntityType } from '../../domain/value-objects/shared-entity-type.enum';
import { ShareDeletedEvent } from '../events/share-deleted.event';
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

  describe('resolveLostAccessUserIds', () => {
    it('should return non-owner users who are not retained by remaining scopes', async () => {
      const ownerId = randomUUID();
      const orgId = randomUUID();
      const retainedUserId = randomUUID();
      const lostUserId = randomUUID();
      const teamId = randomUUID();

      findAllUserIdsByOrgId.execute.mockResolvedValue([
        ownerId,
        retainedUserId,
        lostUserId,
      ]);
      findAllUserIdsByTeamId.execute.mockResolvedValue([retainedUserId]);

      const event = new ShareDeletedEvent(
        SharedEntityType.SKILL,
        randomUUID(),
        ownerId,
        orgId,
        [{ scopeType: ShareScopeType.TEAM, scopeId: teamId }],
      );

      const result = await service.resolveLostAccessUserIds(event);

      expect(result).toEqual([lostUserId]);
    });

    it('should return all non-owner users when no remaining scopes', async () => {
      const ownerId = randomUUID();
      const orgId = randomUUID();
      const userId1 = randomUUID();
      const userId2 = randomUUID();

      findAllUserIdsByOrgId.execute.mockResolvedValue([
        ownerId,
        userId1,
        userId2,
      ]);

      const event = new ShareDeletedEvent(
        SharedEntityType.SKILL,
        randomUUID(),
        ownerId,
        orgId,
        [],
      );

      const result = await service.resolveLostAccessUserIds(event);

      expect(result).toContain(userId1);
      expect(result).toContain(userId2);
      expect(result).not.toContain(ownerId);
    });
  });
});
