import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { KnowledgeBaseShareDeletedListener } from './share-deleted.listener';
import { FindSkillsByKnowledgeBaseAndOwnersUseCase } from 'src/domain/skills/application/use-cases/find-skills-by-knowledge-base-and-owners/find-skills-by-knowledge-base-and-owners.use-case';
import { RemoveKnowledgeBaseFromSkillsUseCase } from 'src/domain/skills/application/use-cases/remove-knowledge-base-from-skills/remove-knowledge-base-from-skills.use-case';
import { FindAllSharesByEntityUseCase } from 'src/domain/shares/application/use-cases/find-all-shares-by-entity/find-all-shares-by-entity.use-case';
import { RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase } from 'src/domain/threads/application/use-cases/remove-knowledge-base-assignments-by-origin-skill/remove-knowledge-base-assignments-by-origin-skill.use-case';
import { ShareScopeResolverService } from 'src/domain/shares/application/services/share-scope-resolver.service';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import {
  OrgShareScope,
  TeamShareScope,
} from 'src/domain/shares/domain/share-scope.entity';
import { SkillShare } from 'src/domain/shares/domain/share.entity';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';

function createSkill(id: UUID, userId: UUID) {
  return {
    id,
    userId,
    name: 'test-skill',
    knowledgeBaseIds: [],
  } as never;
}

function createSkillShare(skillId: UUID, ownerId: UUID, orgId: UUID) {
  return new SkillShare({
    skillId,
    ownerId,
    scope: new OrgShareScope({ orgId }),
  });
}

function createTeamSkillShare(skillId: UUID, ownerId: UUID, teamId: UUID) {
  return new SkillShare({
    skillId,
    ownerId,
    scope: new TeamShareScope({ teamId }),
  });
}

describe('KnowledgeBaseShareDeletedListener', () => {
  let listener: KnowledgeBaseShareDeletedListener;
  let findSkillsByKbAndOwners: { execute: jest.Mock };
  let removeKbFromSkills: { execute: jest.Mock };
  let findAllSharesByEntity: { execute: jest.Mock };
  let removeKbAssignments: { execute: jest.Mock };
  let shareScopeResolver: {
    resolveUserIds: jest.Mock;
    resolveLostAccessUserIds: jest.Mock;
  };

  beforeAll(async () => {
    findSkillsByKbAndOwners = {
      execute: jest.fn().mockResolvedValue([]),
    };

    removeKbFromSkills = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    findAllSharesByEntity = {
      execute: jest.fn().mockResolvedValue([]),
    };

    removeKbAssignments = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    shareScopeResolver = {
      resolveUserIds: jest.fn().mockResolvedValue(new Set()),
      resolveLostAccessUserIds: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseShareDeletedListener,
        {
          provide: FindSkillsByKnowledgeBaseAndOwnersUseCase,
          useValue: findSkillsByKbAndOwners,
        },
        {
          provide: RemoveKnowledgeBaseFromSkillsUseCase,
          useValue: removeKbFromSkills,
        },
        {
          provide: FindAllSharesByEntityUseCase,
          useValue: findAllSharesByEntity,
        },
        {
          provide: RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase,
          useValue: removeKbAssignments,
        },
        {
          provide: ShareScopeResolverService,
          useValue: shareScopeResolver,
        },
      ],
    }).compile();

    listener = module.get(KnowledgeBaseShareDeletedListener);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should ignore non-KB share events', async () => {
    const event = new ShareDeletedEvent(
      SharedEntityType.SKILL,
      randomUUID(),
      randomUUID(),
      randomUUID(),
      [],
    );

    await listener.handleShareDeleted(event);

    expect(findSkillsByKbAndOwners.execute).not.toHaveBeenCalled();
  });

  it('should do nothing when no users lost access', async () => {
    const ownerId = randomUUID();
    const orgId = randomUUID();

    shareScopeResolver.resolveLostAccessUserIds.mockResolvedValue([]);

    const event = new ShareDeletedEvent(
      SharedEntityType.KNOWLEDGE_BASE,
      randomUUID(),
      ownerId,
      orgId,
      [],
    );

    await listener.handleShareDeleted(event);

    expect(findSkillsByKbAndOwners.execute).not.toHaveBeenCalled();
  });

  it('should remove KB from affected skills when users lose access', async () => {
    const kbId = randomUUID();
    const ownerId = randomUUID();
    const orgId = randomUUID();
    const lostUserId = randomUUID();
    const skillId = randomUUID();

    shareScopeResolver.resolveLostAccessUserIds.mockResolvedValue([lostUserId]);

    const skill = createSkill(skillId, lostUserId);
    findSkillsByKbAndOwners.execute.mockResolvedValue([skill]);

    const event = new ShareDeletedEvent(
      SharedEntityType.KNOWLEDGE_BASE,
      kbId,
      ownerId,
      orgId,
      [],
    );

    await listener.handleShareDeleted(event);

    expect(findSkillsByKbAndOwners.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBaseId: kbId,
        ownerIds: [lostUserId],
      }),
    );

    expect(removeKbFromSkills.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBaseId: kbId,
        skillIds: [skillId],
      }),
    );
  });

  it('should cascade to thread KB assignments when affected skill is shared', async () => {
    const kbId = randomUUID();
    const ownerId = randomUUID();
    const orgId = randomUUID();
    const lostUserId = randomUUID();
    const skillShareRecipient = randomUUID();
    const skillId = randomUUID();

    shareScopeResolver.resolveLostAccessUserIds.mockResolvedValue([lostUserId]);

    const skill = createSkill(skillId, lostUserId);
    findSkillsByKbAndOwners.execute.mockResolvedValue([skill]);

    const skillShare = createSkillShare(skillId, lostUserId, orgId);
    findAllSharesByEntity.execute.mockResolvedValue([skillShare]);

    shareScopeResolver.resolveUserIds.mockImplementation(async (scopes) => {
      if (scopes.length > 0 && scopes[0].scopeType === ShareScopeType.ORG) {
        return new Set([skillShareRecipient, lostUserId]);
      }
      return new Set();
    });

    const event = new ShareDeletedEvent(
      SharedEntityType.KNOWLEDGE_BASE,
      kbId,
      ownerId,
      orgId,
      [],
    );

    await listener.handleShareDeleted(event);

    expect(findAllSharesByEntity.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: skillId,
        entityType: SharedEntityType.SKILL,
      }),
    );

    const kbCall = removeKbAssignments.execute.mock.calls[0][0];
    expect(kbCall.skillId).toBe(skillId);
    expect(kbCall.knowledgeBaseId).toBe(kbId);
    expect(kbCall.userIds).toContain(lostUserId);
    expect(kbCall.userIds).toContain(skillShareRecipient);
  });

  it('should not cascade to threads when affected skill is not shared', async () => {
    const kbId = randomUUID();
    const ownerId = randomUUID();
    const orgId = randomUUID();
    const lostUserId = randomUUID();
    const skillId = randomUUID();

    shareScopeResolver.resolveLostAccessUserIds.mockResolvedValue([lostUserId]);

    const skill = createSkill(skillId, lostUserId);
    findSkillsByKbAndOwners.execute.mockResolvedValue([skill]);

    findAllSharesByEntity.execute.mockResolvedValue([]);

    const event = new ShareDeletedEvent(
      SharedEntityType.KNOWLEDGE_BASE,
      kbId,
      ownerId,
      orgId,
      [],
    );

    await listener.handleShareDeleted(event);

    expect(removeKbAssignments.execute).not.toHaveBeenCalled();
  });

  it('should handle partial revocation with remaining scopes', async () => {
    const kbId = randomUUID();
    const ownerId = randomUUID();
    const orgId = randomUUID();
    const teamId = randomUUID();
    const lostUserId = randomUUID();
    const skillId = randomUUID();

    shareScopeResolver.resolveLostAccessUserIds.mockResolvedValue([lostUserId]);

    const skill = createSkill(skillId, lostUserId);
    findSkillsByKbAndOwners.execute.mockResolvedValue([skill]);
    findAllSharesByEntity.execute.mockResolvedValue([]);

    const remainingScopes = [
      { scopeType: ShareScopeType.TEAM, scopeId: teamId },
    ];
    const event = new ShareDeletedEvent(
      SharedEntityType.KNOWLEDGE_BASE,
      kbId,
      ownerId,
      orgId,
      remainingScopes,
    );

    await listener.handleShareDeleted(event);

    expect(findSkillsByKbAndOwners.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBaseId: kbId,
        ownerIds: [lostUserId],
      }),
    );

    expect(removeKbFromSkills.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBaseId: kbId,
        skillIds: [skillId],
      }),
    );
  });

  it('should handle team-scoped skill shares when cascading', async () => {
    const kbId = randomUUID();
    const ownerId = randomUUID();
    const orgId = randomUUID();
    const lostUserId = randomUUID();
    const teamId = randomUUID();
    const teamMember = randomUUID();
    const skillId = randomUUID();

    shareScopeResolver.resolveLostAccessUserIds.mockResolvedValue([lostUserId]);

    const skill = createSkill(skillId, lostUserId);
    findSkillsByKbAndOwners.execute.mockResolvedValue([skill]);

    const skillShare = createTeamSkillShare(skillId, lostUserId, teamId);
    findAllSharesByEntity.execute.mockResolvedValue([skillShare]);

    shareScopeResolver.resolveUserIds.mockImplementation(async (scopes) => {
      if (scopes.length > 0 && scopes[0].scopeType === ShareScopeType.TEAM) {
        return new Set([teamMember]);
      }
      return new Set();
    });

    const event = new ShareDeletedEvent(
      SharedEntityType.KNOWLEDGE_BASE,
      kbId,
      ownerId,
      orgId,
      [],
    );

    await listener.handleShareDeleted(event);

    const kbCall = removeKbAssignments.execute.mock.calls[0][0];
    expect(kbCall.skillId).toBe(skillId);
    expect(kbCall.knowledgeBaseId).toBe(kbId);
    expect(kbCall.userIds).toContain(lostUserId);
    expect(kbCall.userIds).toContain(teamMember);
  });
});
