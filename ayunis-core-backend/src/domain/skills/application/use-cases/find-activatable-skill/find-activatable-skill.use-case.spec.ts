import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { FindActivatableSkillUseCase } from './find-activatable-skill.use-case';

function fixture() {
  const userId = randomUUID();
  const orgId = randomUUID();
  const workspaceId = randomUUID();
  const skill = new WorkspaceSkill({
    workspaceId,
    name: 'Research',
    shortDescription: 'Research a topic',
    instructions: 'Full instructions',
  });
  const thread = new Thread({ userId, workspaceId, messages: [] });
  const repository = {
    findByIds: jest.fn().mockResolvedValue([skill]),
    getWorkspaceSkillStates: jest
      .fn()
      .mockResolvedValue(
        new Map([[skill.id, { isActive: true, isPinned: false }]]),
      ),
    findOne: jest.fn().mockResolvedValue(null),
  };
  const findShare = { execute: jest.fn().mockResolvedValue(null) };
  const principal = { userId, orgId };
  const context = {
    get: jest.fn((key: keyof typeof principal) => principal[key]),
  };
  const authorization = {
    requireExecution: jest.fn().mockResolvedValue(undefined),
  };
  const useCase = new FindActivatableSkillUseCase(
    repository as unknown as SkillRepository,
    findShare as unknown as FindShareByEntityUseCase,
    context as unknown as ContextService,
    authorization as unknown as SkillAuthorizationService,
  );
  return {
    useCase,
    skill,
    thread,
    repository,
    context,
    findShare,
    authorization,
    userId,
  };
}

describe(FindActivatableSkillUseCase.name, () => {
  it('returns an active workspace skill authorized for the thread', async () => {
    const { useCase, skill, thread, repository, authorization } = fixture();
    await expect(useCase.execute({ skillId: skill.id, thread })).resolves.toBe(
      skill,
    );
    expect(authorization.requireExecution).toHaveBeenCalledWith(
      skill,
      thread.id,
    );
    expect(repository.getWorkspaceSkillStates).toHaveBeenCalledWith(
      [skill.id],
      thread.workspaceId,
    );
  });

  it('propagates workspace execution denial from the authorization policy', async () => {
    const { useCase, skill, thread, repository, authorization } = fixture();
    authorization.requireExecution.mockRejectedValue(
      new SkillNotFoundError(skill.id),
    );

    await expect(
      useCase.execute({ skillId: skill.id, thread }),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
    expect(repository.getWorkspaceSkillStates).not.toHaveBeenCalled();
  });

  it('rejects skills outside the thread workspace', async () => {
    const { useCase, skill, thread, repository } = fixture();
    repository.findByIds.mockResolvedValue([]);

    await expect(
      useCase.execute({ skillId: skill.id, thread }),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
    expect(repository.findByIds).toHaveBeenCalledWith(
      [skill.id],
      thread.workspaceId,
    );
    expect(repository.getWorkspaceSkillStates).not.toHaveBeenCalled();
  });

  it('rejects inactive workspace skills', async () => {
    const { useCase, skill, thread, repository } = fixture();
    repository.getWorkspaceSkillStates.mockResolvedValue(new Map());
    await expect(
      useCase.execute({ skillId: skill.id, thread }),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
  });

  it('does not activate a workspace skill on a standalone thread', async () => {
    const { useCase, skill, thread, repository } = fixture();
    thread.workspaceId = null;
    await expect(
      useCase.execute({ skillId: skill.id, thread }),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
    expect(repository.findByIds).not.toHaveBeenCalled();
  });

  it('rejects another user’s thread before looking up resources', async () => {
    const { useCase, skill, thread, repository } = fixture();
    thread.userId = randomUUID();
    await expect(
      useCase.execute({ skillId: skill.id, thread }),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.findByIds).not.toHaveBeenCalled();
  });

  it.each(['owned', 'shared'] as const)(
    'returns an accessible %s personal skill',
    async (accessType) => {
      const { useCase, thread, repository, findShare, userId } = fixture();
      thread.workspaceId = null;
      const skill = new PersonalSkill({
        name: 'Legal research',
        shortDescription: 'Research legal topics',
        instructions: 'Review the applicable regulations.',
        userId: accessType === 'owned' ? userId : randomUUID(),
      });
      if (accessType === 'owned') repository.findOne.mockResolvedValue(skill);
      else {
        findShare.execute.mockResolvedValue({ id: randomUUID() });
        repository.findByIds.mockResolvedValue([skill]);
      }
      await expect(
        useCase.execute({ skillId: skill.id, thread }),
      ).resolves.toBe(skill);
    },
  );
});
