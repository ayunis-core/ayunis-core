jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => (_t: unknown, _p: string, d: PropertyDescriptor) => d,
}));

import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  KnowledgeBaseNotFoundError,
  KnowledgeBaseOwnerChangeNotAllowedError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { KnowledgeBaseOwnerChangeService } from 'src/domain/knowledge-bases/application/services/knowledge-base-owner-change.service';
import type { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import type { UnlinkKnowledgeBaseFromOtherOwnersUseCase } from 'src/domain/skills/application/use-cases/unlink-knowledge-base-from-other-owners/unlink-knowledge-base-from-other-owners.use-case';
import type { RemoveDirectKnowledgeBaseFromThreadsUseCase } from 'src/domain/threads/application/use-cases/remove-direct-knowledge-base-from-threads/remove-direct-knowledge-base-from-threads.use-case';
import type { FindUserIdsOutsideAudienceUseCase } from 'src/iam/teams/application/use-cases/find-user-ids-outside-audience/find-user-ids-outside-audience.use-case';
import { ChangeKnowledgeBaseOwnerCommand } from './change-knowledge-base-owner.command';
import { ChangeKnowledgeBaseOwnerUseCase } from './change-knowledge-base-owner.use-case';

describe(ChangeKnowledgeBaseOwnerUseCase.name, () => {
  const userId = randomUUID();
  const orgId = randomUUID();
  const formerMemberId = randomUUID();
  const personal = new PersonalKnowledgeBase({
    name: 'Bauordnung',
    orgId,
    userId,
  });
  const org = new OrgKnowledgeBase({
    id: personal.id,
    name: 'Bauordnung',
    orgId,
    isActive: true,
  });

  function setup(
    existing: KnowledgeBase,
    target: KnowledgeBase,
    changed = true,
  ) {
    const repository = {
      findById: jest.fn().mockResolvedValue(existing),
      save: jest.fn().mockImplementation((kb) => Promise.resolve(kb)),
      activate: jest.fn(),
      deactivateAllUsers: jest.fn(),
    };
    const writeAccess = { requireWrite: jest.fn(), requireCreate: jest.fn() };
    const planner = { plan: jest.fn().mockResolvedValue({ changed, target }) };
    const unlinkSkills = {
      execute: jest.fn().mockResolvedValue({ unlinkedSkillCount: 1 }),
    };
    const removeFromThreads = { execute: jest.fn() };
    const findUsersOutside = {
      execute: jest.fn().mockResolvedValue([formerMemberId]),
    };
    const useCase = new ChangeKnowledgeBaseOwnerUseCase(
      repository as unknown as KnowledgeBaseRepository,
      writeAccess as unknown as KnowledgeBaseWriteAccessService,
      planner as unknown as KnowledgeBaseOwnerChangeService,
      unlinkSkills as unknown as UnlinkKnowledgeBaseFromOtherOwnersUseCase,
      removeFromThreads as unknown as RemoveDirectKnowledgeBaseFromThreadsUseCase,
      findUsersOutside as unknown as FindUserIdsOutsideAudienceUseCase,
      {
        get: jest.fn(getFromUserContext({ userId, orgId })),
      } as unknown as ContextService,
    );
    return {
      repository,
      writeAccess,
      planner,
      unlinkSkills,
      removeFromThreads,
      findUsersOutside,
      useCase,
    };
  }

  it('moves a personal knowledge base to the organization', async () => {
    const {
      useCase,
      repository,
      writeAccess,
      unlinkSkills,
      removeFromThreads,
    } = setup(personal, org);

    const result = await useCase.execute(
      new ChangeKnowledgeBaseOwnerCommand(personal.id, { type: 'org' }),
    );

    expect(repository.findById).toHaveBeenCalledWith(personal.id, {
      lock: true,
    });
    expect(writeAccess.requireWrite).toHaveBeenCalledWith(personal);
    expect(writeAccess.requireCreate).toHaveBeenCalledWith(org);
    expect(repository.save).toHaveBeenCalledWith(org);
    expect(repository.deactivateAllUsers).toHaveBeenCalledWith(personal.id);
    expect(repository.activate).not.toHaveBeenCalled();
    expect(unlinkSkills.execute).toHaveBeenCalledWith(
      expect.objectContaining({ knowledgeBase: org, dryRun: false }),
    );
    expect(removeFromThreads.execute).not.toHaveBeenCalled();
    expect(result).toBe(org);
  });

  it('gives the mover the global activation when it becomes personal', async () => {
    const { useCase, repository } = setup(org, personal);

    await useCase.execute(
      new ChangeKnowledgeBaseOwnerCommand(org.id, { type: 'personal' }),
    );

    expect(repository.deactivateAllUsers).toHaveBeenCalledWith(org.id);
    expect(repository.activate).toHaveBeenCalledWith(org.id, userId);
    expect(
      repository.deactivateAllUsers.mock.invocationCallOrder[0],
    ).toBeLessThan(repository.activate.mock.invocationCallOrder[0]);
  });

  it('removes it from the threads of everyone else in the organization when it becomes personal', async () => {
    const { useCase, findUsersOutside, removeFromThreads } = setup(
      org,
      personal,
    );

    await useCase.execute(
      new ChangeKnowledgeBaseOwnerCommand(org.id, { type: 'personal' }),
    );

    expect(findUsersOutside.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId, audience: { type: 'user', userId } }),
    );
    expect(removeFromThreads.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeBaseId: org.id,
        userIds: [formerMemberId],
      }),
    );
  });

  it('switches it off for the mover when a switched-off knowledge base becomes personal', async () => {
    const inactive = new OrgKnowledgeBase({
      id: personal.id,
      name: 'Bauordnung',
      orgId,
    });
    const { useCase, repository } = setup(inactive, personal);

    await useCase.execute(
      new ChangeKnowledgeBaseOwnerCommand(inactive.id, { type: 'personal' }),
    );

    expect(repository.deactivateAllUsers).toHaveBeenCalledWith(inactive.id);
    expect(repository.activate).not.toHaveBeenCalled();
  });

  it('changes nothing when the owner stays the same', async () => {
    const { useCase, repository, writeAccess, unlinkSkills } = setup(
      org,
      org,
      false,
    );

    await useCase.execute(
      new ChangeKnowledgeBaseOwnerCommand(org.id, { type: 'org' }),
    );

    expect(writeAccess.requireCreate).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
    expect(unlinkSkills.execute).not.toHaveBeenCalled();
  });

  it('does not move it when the caller cannot manage the target', async () => {
    const { useCase, repository, writeAccess, removeFromThreads } = setup(
      personal,
      org,
    );
    writeAccess.requireCreate.mockRejectedValue(new UnauthorizedAccessError());

    await expect(
      useCase.execute(
        new ChangeKnowledgeBaseOwnerCommand(personal.id, { type: 'org' }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.save).not.toHaveBeenCalled();
    expect(removeFromThreads.execute).not.toHaveBeenCalled();
  });

  it('keeps workspace knowledge bases in their workspace', async () => {
    const workspace = new WorkspaceKnowledgeBase({
      name: 'Projekt',
      orgId,
      workspaceId: randomUUID(),
    });
    const { useCase, writeAccess, planner } = setup(workspace, workspace);

    await expect(
      useCase.execute(
        new ChangeKnowledgeBaseOwnerCommand(workspace.id, { type: 'org' }),
      ),
    ).rejects.toBeInstanceOf(KnowledgeBaseOwnerChangeNotAllowedError);
    expect(writeAccess.requireWrite).toHaveBeenCalledWith(workspace);
    expect(planner.plan).not.toHaveBeenCalled();
  });

  it('hides workspace knowledge bases the caller cannot manage before saying they cannot move', async () => {
    const workspace = new WorkspaceKnowledgeBase({
      name: 'Projekt',
      orgId,
      workspaceId: randomUUID(),
    });
    const { useCase, writeAccess } = setup(workspace, workspace);
    writeAccess.requireWrite.mockRejectedValue(
      new KnowledgeBaseNotFoundError(workspace.id),
    );

    await expect(
      useCase.execute(
        new ChangeKnowledgeBaseOwnerCommand(workspace.id, { type: 'org' }),
      ),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
  });
});
