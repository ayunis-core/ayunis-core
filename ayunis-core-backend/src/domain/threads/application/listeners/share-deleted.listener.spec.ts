import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ShareDeletedListener } from './share-deleted.listener';
import { RemoveSkillSourcesFromThreadsUseCase } from '../use-cases/remove-skill-sources-from-threads/remove-skill-sources-from-threads.use-case';
import { RemoveKbAssignmentsByOriginSkillUseCase } from '../use-cases/remove-kb-assignments-by-origin-skill/remove-kb-assignments-by-origin-skill.use-case';
import { FindAllUserIdsByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.use-case';
import { FindAllUserIdsByTeamIdUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.use-case';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import { randomUUID } from 'crypto';

describe('ShareDeletedListener (threads)', () => {
  let listener: ShareDeletedListener;
  let removeSkillSources: { execute: jest.Mock };
  let removeKbAssignmentsByOriginSkill: { execute: jest.Mock };
  let findAllUserIdsByOrgId: { execute: jest.Mock };
  let findAllUserIdsByTeamId: { execute: jest.Mock };

  beforeAll(async () => {
    removeSkillSources = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    removeKbAssignmentsByOriginSkill = {
      execute: jest.fn().mockResolvedValue(undefined),
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
        {
          provide: RemoveSkillSourcesFromThreadsUseCase,
          useValue: removeSkillSources,
        },
        {
          provide: RemoveKbAssignmentsByOriginSkillUseCase,
          useValue: removeKbAssignmentsByOriginSkill,
        },
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should remove skill sources and KB assignments from all non-owner users when no remaining scopes exist', async () => {
    const skillId = randomUUID();
    const ownerId = randomUUID();
    const orgId = randomUUID();
    const orgUserId1 = randomUUID();
    const orgUserId2 = randomUUID();

    findAllUserIdsByOrgId.execute.mockResolvedValue([
      ownerId,
      orgUserId1,
      orgUserId2,
    ]);

    const event = new ShareDeletedEvent(
      SharedEntityType.SKILL,
      skillId,
      ownerId,
      orgId,
      [],
    );

    await listener.handleShareDeleted(event);

    expect(findAllUserIdsByOrgId.execute).toHaveBeenCalledWith({ orgId });

    const sourceCall = removeSkillSources.execute.mock.calls[0][0];
    expect(sourceCall.skillId).toBe(skillId);
    expect(sourceCall.userIds).toContain(orgUserId1);
    expect(sourceCall.userIds).toContain(orgUserId2);
    expect(sourceCall.userIds).not.toContain(ownerId);

    const kbCall = removeKbAssignmentsByOriginSkill.execute.mock.calls[0][0];
    expect(kbCall.skillId).toBe(skillId);
    expect(kbCall.userIds).toContain(orgUserId1);
    expect(kbCall.userIds).toContain(orgUserId2);
    expect(kbCall.userIds).not.toContain(ownerId);
  });

  it('should remove skill sources and KB assignments only from users who lost access when remaining scopes exist', async () => {
    const skillId = randomUUID();
    const ownerId = randomUUID();
    const orgId = randomUUID();
    const teamId = randomUUID();
    const retainedUserId = randomUUID();
    const orgUserId1 = randomUUID();
    const orgUserId2 = randomUUID();

    findAllUserIdsByOrgId.execute.mockResolvedValue([
      ownerId,
      retainedUserId,
      orgUserId1,
      orgUserId2,
    ]);
    findAllUserIdsByTeamId.execute.mockResolvedValue([retainedUserId]);

    const event = new ShareDeletedEvent(
      SharedEntityType.SKILL,
      skillId,
      ownerId,
      orgId,
      [{ scopeType: ShareScopeType.TEAM, scopeId: teamId }],
    );

    await listener.handleShareDeleted(event);

    const sourceCall = removeSkillSources.execute.mock.calls[0][0];
    expect(sourceCall.skillId).toBe(skillId);
    expect(sourceCall.userIds).toContain(orgUserId1);
    expect(sourceCall.userIds).toContain(orgUserId2);
    expect(sourceCall.userIds).not.toContain(ownerId);
    expect(sourceCall.userIds).not.toContain(retainedUserId);

    const kbCall = removeKbAssignmentsByOriginSkill.execute.mock.calls[0][0];
    expect(kbCall.skillId).toBe(skillId);
    expect(kbCall.userIds).toContain(orgUserId1);
    expect(kbCall.userIds).toContain(orgUserId2);
    expect(kbCall.userIds).not.toContain(ownerId);
    expect(kbCall.userIds).not.toContain(retainedUserId);
  });

  it('should not remove anything when a non-skill share is deleted', async () => {
    const event = new ShareDeletedEvent(
      SharedEntityType.AGENT,
      randomUUID(),
      randomUUID(),
      randomUUID(),
      [],
    );

    await listener.handleShareDeleted(event);

    expect(removeSkillSources.execute).not.toHaveBeenCalled();
    expect(removeKbAssignmentsByOriginSkill.execute).not.toHaveBeenCalled();
  });

  it('should not remove anything when a prompt share is deleted', async () => {
    const event = new ShareDeletedEvent(
      SharedEntityType.PROMPT,
      randomUUID(),
      randomUUID(),
      randomUUID(),
      [],
    );

    await listener.handleShareDeleted(event);

    expect(removeSkillSources.execute).not.toHaveBeenCalled();
    expect(removeKbAssignmentsByOriginSkill.execute).not.toHaveBeenCalled();
  });
});
