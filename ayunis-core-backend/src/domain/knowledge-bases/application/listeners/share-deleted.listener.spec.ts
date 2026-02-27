import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { KnowledgeBaseShareDeletedListener } from './share-deleted.listener';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SharesRepository } from 'src/domain/shares/application/ports/shares-repository.port';
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

function createTeamSkillShare(
  skillId: UUID,
  ownerId: UUID,
  teamId: UUID,
) {
  return new SkillShare({
    skillId,
    ownerId,
    scope: new TeamShareScope({ teamId }),
  });
}

describe('KnowledgeBaseShareDeletedListener', () => {
  let listener: KnowledgeBaseShareDeletedListener;
  let skillRepository: {
    findSkillsByKnowledgeBaseAndOwners: jest.Mock;
    removeKnowledgeBaseFromSkills: jest.Mock;
  };
  let sharesRepository: {
    findByEntityIdAndType: jest.Mock;
  };
  let removeKbAssignments: { execute: jest.Mock };
  let shareScopeResolver: {
    resolveUserIds: jest.Mock;
    resolveAllOrgUserIds: jest.Mock;
  };

  beforeAll(async () => {
    skillRepository = {
      findSkillsByKnowledgeBaseAndOwners: jest.fn().mockResolvedValue([]),
      removeKnowledgeBaseFromSkills: jest.fn().mockResolvedValue(undefined),
    };

    sharesRepository = {
      findByEntityIdAndType: jest.fn().mockResolvedValue([]),
    };

    removeKbAssignments = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    shareScopeResolver = {
      resolveUserIds: jest.fn().mockResolvedValue(new Set()),
      resolveAllOrgUserIds: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseShareDeletedListener,
        { provide: SkillRepository, useValue: skillRepository },
        { provide: SharesRepository, useValue: sharesRepository },
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

    expect(
      skillRepository.findSkillsByKnowledgeBaseAndOwners,
    ).not.toHaveBeenCalled();
  });

  it('should do nothing when no users lost access', async () => {
    const ownerId = randomUUID();
    const orgId = randomUUID();

    shareScopeResolver.resolveAllOrgUserIds.mockResolvedValue([ownerId]);

    const event = new ShareDeletedEvent(
      SharedEntityType.KNOWLEDGE_BASE,
      randomUUID(),
      ownerId,
      orgId,
      [],
    );

    await listener.handleShareDeleted(event);

    expect(
      skillRepository.findSkillsByKnowledgeBaseAndOwners,
    ).not.toHaveBeenCalled();
  });

  it('should remove KB from affected skills when users lose access', async () => {
    const kbId = randomUUID();
    const ownerId = randomUUID();
    const orgId = randomUUID();
    const lostUserId = randomUUID();
    const skillId = randomUUID();

    shareScopeResolver.resolveAllOrgUserIds.mockResolvedValue([
      ownerId,
      lostUserId,
    ]);

    const skill = createSkill(skillId, lostUserId);
    skillRepository.findSkillsByKnowledgeBaseAndOwners.mockResolvedValue([
      skill,
    ]);

    const event = new ShareDeletedEvent(
      SharedEntityType.KNOWLEDGE_BASE,
      kbId,
      ownerId,
      orgId,
      [],
    );

    await listener.handleShareDeleted(event);

    expect(
      skillRepository.findSkillsByKnowledgeBaseAndOwners,
    ).toHaveBeenCalledWith(kbId, [lostUserId]);

    expect(skillRepository.removeKnowledgeBaseFromSkills).toHaveBeenCalledWith(
      kbId,
      [skillId],
    );
  });

  it('should cascade to thread KB assignments when affected skill is shared', async () => {
    const kbId = randomUUID();
    const ownerId = randomUUID();
    const orgId = randomUUID();
    const lostUserId = randomUUID();
    const skillShareRecipient = randomUUID();
    const skillId = randomUUID();

    shareScopeResolver.resolveAllOrgUserIds.mockResolvedValue([
      ownerId,
      lostUserId,
    ]);

    const skill = createSkill(skillId, lostUserId);
    skillRepository.findSkillsByKnowledgeBaseAndOwners.mockResolvedValue([
      skill,
    ]);

    const skillShare = createSkillShare(skillId, lostUserId, orgId);
    sharesRepository.findByEntityIdAndType.mockResolvedValue([skillShare]);

    // Resolve users who have access to the skill via its share
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

    expect(sharesRepository.findByEntityIdAndType).toHaveBeenCalledWith(
      skillId,
      SharedEntityType.SKILL,
    );

    const kbCall = removeKbAssignments.execute.mock.calls[0][0];
    expect(kbCall.skillId).toBe(skillId);
    // Should include skill owner + share recipients (minus owner)
    expect(kbCall.userIds).toContain(lostUserId); // skill owner
    expect(kbCall.userIds).toContain(skillShareRecipient);
  });

  it('should not cascade to threads when affected skill is not shared', async () => {
    const kbId = randomUUID();
    const ownerId = randomUUID();
    const orgId = randomUUID();
    const lostUserId = randomUUID();
    const skillId = randomUUID();

    shareScopeResolver.resolveAllOrgUserIds.mockResolvedValue([
      ownerId,
      lostUserId,
    ]);

    const skill = createSkill(skillId, lostUserId);
    skillRepository.findSkillsByKnowledgeBaseAndOwners.mockResolvedValue([
      skill,
    ]);

    sharesRepository.findByEntityIdAndType.mockResolvedValue([]);

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
    const retainedUserId = randomUUID();
    const lostUserId = randomUUID();
    const skillId = randomUUID();

    shareScopeResolver.resolveAllOrgUserIds.mockResolvedValue([
      ownerId,
      retainedUserId,
      lostUserId,
    ]);
    // First call: remaining scopes resolution (retained user)
    // Second call would be for skill share scopes
    shareScopeResolver.resolveUserIds.mockResolvedValueOnce(
      new Set([retainedUserId]),
    );

    const skill = createSkill(skillId, lostUserId);
    skillRepository.findSkillsByKnowledgeBaseAndOwners.mockResolvedValue([
      skill,
    ]);
    sharesRepository.findByEntityIdAndType.mockResolvedValue([]);

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

    expect(
      skillRepository.findSkillsByKnowledgeBaseAndOwners,
    ).toHaveBeenCalledWith(kbId, [lostUserId]);

    expect(skillRepository.removeKnowledgeBaseFromSkills).toHaveBeenCalledWith(
      kbId,
      [skillId],
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

    shareScopeResolver.resolveAllOrgUserIds.mockResolvedValue([
      ownerId,
      lostUserId,
    ]);

    const skill = createSkill(skillId, lostUserId);
    skillRepository.findSkillsByKnowledgeBaseAndOwners.mockResolvedValue([
      skill,
    ]);

    const skillShare = createTeamSkillShare(skillId, lostUserId, teamId);
    sharesRepository.findByEntityIdAndType.mockResolvedValue([skillShare]);

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
    expect(kbCall.userIds).toContain(lostUserId);
    expect(kbCall.userIds).toContain(teamMember);
  });
});
