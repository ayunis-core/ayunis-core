import { Test, TestingModule } from '@nestjs/testing';
import { ShareDeletedListener } from './share-deleted.listener';
import { SkillRepository } from '../ports/skill.repository';
import { FindAllUserIdsByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.use-case';
import { FindAllUserIdsByTeamIdUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.use-case';
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
  let findAllUserIdsByOrgId: { execute: jest.Mock };
  let findAllUserIdsByTeamId: { execute: jest.Mock };

  beforeEach(async () => {
    skillRepository = {
      deactivateAllExceptOwner: jest.fn().mockResolvedValue(undefined),
      deactivateUsersNotInSet: jest.fn().mockResolvedValue(undefined),
    };

    findAllUserIdsByOrgId = {
      execute: jest.fn().mockResolvedValue([]),
    };

    findAllUserIdsByTeamId = {
      execute: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareDeletedListener,
        { provide: SkillRepository, useValue: skillRepository },
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

    listener = module.get<ShareDeletedListener>(ShareDeletedListener);
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

    findAllUserIdsByTeamId.execute.mockResolvedValue([coveredUserId]);

    await listener.handleShareDeleted(event);

    expect(findAllUserIdsByTeamId.execute).toHaveBeenCalledWith({ teamId });
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

    findAllUserIdsByOrgId.execute.mockResolvedValue([coveredUserId]);

    await listener.handleShareDeleted(event);

    expect(findAllUserIdsByOrgId.execute).toHaveBeenCalledWith({ orgId });
    expect(skillRepository.deactivateUsersNotInSet).toHaveBeenCalledWith(
      skillId,
      ownerId,
      new Set([coveredUserId]),
    );
    expect(skillRepository.deactivateAllExceptOwner).not.toHaveBeenCalled();
  });

  it('should merge user IDs from multiple remaining scopes without duplicates', async () => {
    const skillId = randomUUID();
    const ownerId = randomUUID();
    const orgId = randomUUID();
    const teamId = randomUUID();
    const sharedUserId = randomUUID();
    const orgOnlyUserId = randomUUID();
    const teamOnlyUserId = randomUUID();

    const event = new ShareDeletedEvent(
      SharedEntityType.SKILL,
      skillId,
      ownerId,
      orgId,
      [
        { scopeType: ShareScopeType.ORG, scopeId: orgId },
        { scopeType: ShareScopeType.TEAM, scopeId: teamId },
      ],
    );

    findAllUserIdsByOrgId.execute.mockResolvedValue([
      sharedUserId,
      orgOnlyUserId,
    ]);
    findAllUserIdsByTeamId.execute.mockResolvedValue([
      sharedUserId,
      teamOnlyUserId,
    ]);

    await listener.handleShareDeleted(event);

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
