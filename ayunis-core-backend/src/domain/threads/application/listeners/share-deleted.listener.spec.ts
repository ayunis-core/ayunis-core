import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ShareDeletedListener } from './share-deleted.listener';
import { RemoveSkillSourcesFromThreadsUseCase } from '../use-cases/remove-skill-sources-from-threads/remove-skill-sources-from-threads.use-case';
import { RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase } from '../use-cases/remove-knowledge-base-assignments-by-origin-skill/remove-knowledge-base-assignments-by-origin-skill.use-case';
import { RemoveDirectKnowledgeBaseFromThreadsUseCase } from '../use-cases/remove-direct-knowledge-base-from-threads/remove-direct-knowledge-base-from-threads.use-case';
import { ShareScopeResolverService } from 'src/domain/shares/application/services/share-scope-resolver.service';
import { ShareDeletedEvent } from 'src/domain/shares/application/events/share-deleted.event';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import { randomUUID } from 'crypto';

describe('ShareDeletedListener (threads)', () => {
  let listener: ShareDeletedListener;
  let removeSkillSources: { execute: jest.Mock };
  let removeKbAssignmentsByOriginSkill: { execute: jest.Mock };
  let removeDirectKbFromThreads: { execute: jest.Mock };
  let shareScopeResolver: {
    resolveUserIds: jest.Mock;
    resolveAllOrgUserIds: jest.Mock;
    resolveLostAccessUserIds: jest.Mock;
  };

  beforeAll(async () => {
    removeSkillSources = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    removeKbAssignmentsByOriginSkill = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    removeDirectKbFromThreads = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    shareScopeResolver = {
      resolveUserIds: jest.fn().mockResolvedValue(new Set()),
      resolveAllOrgUserIds: jest.fn().mockResolvedValue([]),
      resolveLostAccessUserIds: null as unknown as jest.Mock,
    };
    shareScopeResolver.resolveLostAccessUserIds = jest
      .fn()
      .mockImplementation(async (event: ShareDeletedEvent) => {
        const all = await shareScopeResolver.resolveAllOrgUserIds(event.orgId);
        const retain = await shareScopeResolver.resolveUserIds(
          event.remainingScopes,
        );
        return all.filter(
          (id: string) => id !== event.ownerId && !retain.has(id),
        );
      });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareDeletedListener,
        {
          provide: RemoveSkillSourcesFromThreadsUseCase,
          useValue: removeSkillSources,
        },
        {
          provide: RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase,
          useValue: removeKbAssignmentsByOriginSkill,
        },
        {
          provide: RemoveDirectKnowledgeBaseFromThreadsUseCase,
          useValue: removeDirectKbFromThreads,
        },
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

  describe('skill share deletion', () => {
    it('should remove skill sources and KB assignments from all non-owner users when no remaining scopes exist', async () => {
      const skillId = randomUUID();
      const ownerId = randomUUID();
      const orgId = randomUUID();
      const orgUserId1 = randomUUID();
      const orgUserId2 = randomUUID();

      shareScopeResolver.resolveAllOrgUserIds.mockResolvedValue([
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

      expect(shareScopeResolver.resolveAllOrgUserIds).toHaveBeenCalledWith(
        orgId,
      );

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

      shareScopeResolver.resolveAllOrgUserIds.mockResolvedValue([
        ownerId,
        retainedUserId,
        orgUserId1,
        orgUserId2,
      ]);
      shareScopeResolver.resolveUserIds.mockResolvedValue(
        new Set([retainedUserId]),
      );

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

      await listener.handleShareDeleted(event);

      expect(shareScopeResolver.resolveUserIds).toHaveBeenCalledWith(
        remainingScopes,
      );

      const sourceCall = removeSkillSources.execute.mock.calls[0][0];
      expect(sourceCall.userIds).toContain(orgUserId1);
      expect(sourceCall.userIds).toContain(orgUserId2);
      expect(sourceCall.userIds).not.toContain(ownerId);
      expect(sourceCall.userIds).not.toContain(retainedUserId);

      const kbCall = removeKbAssignmentsByOriginSkill.execute.mock.calls[0][0];
      expect(kbCall.userIds).toContain(orgUserId1);
      expect(kbCall.userIds).toContain(orgUserId2);
      expect(kbCall.userIds).not.toContain(ownerId);
      expect(kbCall.userIds).not.toContain(retainedUserId);
    });
  });

  describe('knowledge base share deletion', () => {
    it('should remove direct KB assignments from all non-owner users when no remaining scopes exist', async () => {
      const knowledgeBaseId = randomUUID();
      const ownerId = randomUUID();
      const orgId = randomUUID();
      const orgUserId1 = randomUUID();
      const orgUserId2 = randomUUID();

      shareScopeResolver.resolveAllOrgUserIds.mockResolvedValue([
        ownerId,
        orgUserId1,
        orgUserId2,
      ]);

      const event = new ShareDeletedEvent(
        SharedEntityType.KNOWLEDGE_BASE,
        knowledgeBaseId,
        ownerId,
        orgId,
        [],
      );

      await listener.handleShareDeleted(event);

      expect(shareScopeResolver.resolveAllOrgUserIds).toHaveBeenCalledWith(
        orgId,
      );

      const call = removeDirectKbFromThreads.execute.mock.calls[0][0];
      expect(call.knowledgeBaseId).toBe(knowledgeBaseId);
      expect(call.userIds).toContain(orgUserId1);
      expect(call.userIds).toContain(orgUserId2);
      expect(call.userIds).not.toContain(ownerId);
    });

    it('should remove direct KB assignments only from users who lost access when remaining scopes exist', async () => {
      const knowledgeBaseId = randomUUID();
      const ownerId = randomUUID();
      const orgId = randomUUID();
      const teamId = randomUUID();
      const retainedUserId = randomUUID();
      const lostUserId = randomUUID();

      shareScopeResolver.resolveAllOrgUserIds.mockResolvedValue([
        ownerId,
        retainedUserId,
        lostUserId,
      ]);
      shareScopeResolver.resolveUserIds.mockResolvedValue(
        new Set([retainedUserId]),
      );

      const remainingScopes = [
        { scopeType: ShareScopeType.TEAM, scopeId: teamId },
      ];
      const event = new ShareDeletedEvent(
        SharedEntityType.KNOWLEDGE_BASE,
        knowledgeBaseId,
        ownerId,
        orgId,
        remainingScopes,
      );

      await listener.handleShareDeleted(event);

      const call = removeDirectKbFromThreads.execute.mock.calls[0][0];
      expect(call.knowledgeBaseId).toBe(knowledgeBaseId);
      expect(call.userIds).toContain(lostUserId);
      expect(call.userIds).not.toContain(ownerId);
      expect(call.userIds).not.toContain(retainedUserId);
    });
  });

  it('should not remove anything when a non-skill/non-KB share is deleted', async () => {
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
    expect(removeDirectKbFromThreads.execute).not.toHaveBeenCalled();
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
    expect(removeDirectKbFromThreads.execute).not.toHaveBeenCalled();
  });
});
