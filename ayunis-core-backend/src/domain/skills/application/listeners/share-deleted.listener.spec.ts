import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ShareDeletedListener } from './share-deleted.listener';
import { SkillRepository } from '../ports/skill.repository';
import { ShareScopeResolverService } from 'src/domain/shares/application/services/share-scope-resolver.service';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import { randomUUID } from 'crypto';

describe('ShareDeletedListener', () => {
  let listener: ShareDeletedListener;
  let skillRepository: {
    deactivateAllExceptOwner: jest.Mock;
    deactivateUsersNotInSet: jest.Mock;
  };
  let shareScopeResolver: { resolveUserIds: jest.Mock };

  beforeAll(async () => {
    skillRepository = {
      deactivateAllExceptOwner: jest.fn().mockResolvedValue(undefined),
      deactivateUsersNotInSet: jest.fn().mockResolvedValue(undefined),
    };

    shareScopeResolver = {
      resolveUserIds: jest.fn().mockResolvedValue(new Set()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareDeletedListener,
        { provide: SkillRepository, useValue: skillRepository },
        {
          provide: ShareScopeResolverService,
          useValue: shareScopeResolver,
        },
      ],
    }).compile();

    listener = module.get<ShareDeletedListener>(ShareDeletedListener);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should deactivate all non-owner activations when no remaining scopes exist', async () => {
    const skillId = randomUUID();
    const ownerId = randomUUID();
    const orgId = randomUUID();
    const event = new ShareDeletedEvent(
      SharedEntityType.SKILL,
      skillId,
      ownerId,
      orgId,
      [],
    );

    await listener.handleShareDeleted(event);

    expect(skillRepository.deactivateAllExceptOwner).toHaveBeenCalledWith(
      skillId,
      ownerId,
    );
    expect(skillRepository.deactivateUsersNotInSet).not.toHaveBeenCalled();
  });

  it('should deactivate only users not covered by remaining team scope', async () => {
    const skillId = randomUUID();
    const ownerId = randomUUID();
    const orgId = randomUUID();
    const teamId = randomUUID();
    const coveredUserId = randomUUID();

    const remainingScopes = [
      { scopeType: ShareScopeType.TEAM, scopeId: teamId },
    ];
    const event = new ShareDeletedEvent(
      SharedEntityType.SKILL,
      skillId,
      ownerId,
      orgId,
      remainingScopes,
    );

    shareScopeResolver.resolveUserIds.mockResolvedValue(
      new Set([coveredUserId]),
    );

    await listener.handleShareDeleted(event);

    expect(shareScopeResolver.resolveUserIds).toHaveBeenCalledWith(
      remainingScopes,
    );
    expect(skillRepository.deactivateUsersNotInSet).toHaveBeenCalledWith(
      skillId,
      ownerId,
      new Set([coveredUserId]),
    );
    expect(skillRepository.deactivateAllExceptOwner).not.toHaveBeenCalled();
  });

  it('should deactivate only users not covered by remaining org scope', async () => {
    const skillId = randomUUID();
    const ownerId = randomUUID();
    const orgId = randomUUID();
    const coveredUserId = randomUUID();

    const remainingScopes = [{ scopeType: ShareScopeType.ORG, scopeId: orgId }];
    const event = new ShareDeletedEvent(
      SharedEntityType.SKILL,
      skillId,
      ownerId,
      orgId,
      remainingScopes,
    );

    shareScopeResolver.resolveUserIds.mockResolvedValue(
      new Set([coveredUserId]),
    );

    await listener.handleShareDeleted(event);

    expect(shareScopeResolver.resolveUserIds).toHaveBeenCalledWith(
      remainingScopes,
    );
    expect(skillRepository.deactivateUsersNotInSet).toHaveBeenCalledWith(
      skillId,
      ownerId,
      new Set([coveredUserId]),
    );
    expect(skillRepository.deactivateAllExceptOwner).not.toHaveBeenCalled();
  });

  it('should pass multiple remaining scopes to the resolver', async () => {
    const skillId = randomUUID();
    const ownerId = randomUUID();
    const orgId = randomUUID();
    const teamId = randomUUID();
    const sharedUserId = randomUUID();
    const orgOnlyUserId = randomUUID();
    const teamOnlyUserId = randomUUID();

    const remainingScopes = [
      { scopeType: ShareScopeType.ORG, scopeId: orgId },
      { scopeType: ShareScopeType.TEAM, scopeId: teamId },
    ];
    const event = new ShareDeletedEvent(
      SharedEntityType.SKILL,
      skillId,
      ownerId,
      orgId,
      remainingScopes,
    );

    shareScopeResolver.resolveUserIds.mockResolvedValue(
      new Set([sharedUserId, orgOnlyUserId, teamOnlyUserId]),
    );

    await listener.handleShareDeleted(event);

    expect(shareScopeResolver.resolveUserIds).toHaveBeenCalledWith(
      remainingScopes,
    );
    expect(skillRepository.deactivateUsersNotInSet).toHaveBeenCalledWith(
      skillId,
      ownerId,
      new Set([sharedUserId, orgOnlyUserId, teamOnlyUserId]),
    );
  });

  it('should not deactivate anything when an agent share is deleted', async () => {
    const event = new ShareDeletedEvent(
      SharedEntityType.AGENT,
      randomUUID(),
      randomUUID(),
      randomUUID(),
      [],
    );

    await listener.handleShareDeleted(event);

    expect(skillRepository.deactivateAllExceptOwner).not.toHaveBeenCalled();
    expect(skillRepository.deactivateUsersNotInSet).not.toHaveBeenCalled();
  });

  it('should not deactivate anything when a prompt share is deleted', async () => {
    const event = new ShareDeletedEvent(
      SharedEntityType.PROMPT,
      randomUUID(),
      randomUUID(),
      randomUUID(),
      [],
    );

    await listener.handleShareDeleted(event);

    expect(skillRepository.deactivateAllExceptOwner).not.toHaveBeenCalled();
    expect(skillRepository.deactivateUsersNotInSet).not.toHaveBeenCalled();
  });
});
