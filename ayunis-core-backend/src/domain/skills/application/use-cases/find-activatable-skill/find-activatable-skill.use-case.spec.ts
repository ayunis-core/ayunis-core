import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import type { WorkspaceSkillLinkRepository } from 'src/domain/skills/application/ports/workspace-skill-link.repository';
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
    findById: jest.fn().mockResolvedValue(null),
  };
  const principal = { userId, orgId };
  const context = {
    get: jest.fn((key: keyof typeof principal) => principal[key]),
  };
  const authorization = {
    requireExecution: jest.fn().mockResolvedValue(undefined),
    requireUse: jest.fn().mockResolvedValue(undefined),
  };
  const links = { isLinked: jest.fn().mockResolvedValue(false) };
  const useCase = new FindActivatableSkillUseCase(
    repository as unknown as SkillRepository,
    context as unknown as ContextService,
    authorization as unknown as SkillAuthorizationService,
    links as unknown as WorkspaceSkillLinkRepository,
  );
  return {
    useCase,
    skill,
    thread,
    repository,
    context,
    authorization,
    links,
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

  it('returns an owned personal skill', async () => {
    const { useCase, thread, repository, userId } = fixture();
    thread.workspaceId = null;
    const skill = new PersonalSkill({
      name: 'Legal research',
      shortDescription: 'Research legal topics',
      instructions: 'Review the applicable regulations.',
      userId,
    });
    repository.findOne.mockResolvedValue(skill);
    await expect(useCase.execute({ skillId: skill.id, thread })).resolves.toBe(
      skill,
    );
  });

  it('does not activate another person’s personal skill', async () => {
    const { useCase, thread, repository } = fixture();
    thread.workspaceId = null;
    const skill = new PersonalSkill({
      name: 'Legal research',
      shortDescription: 'Research legal topics',
      instructions: 'Review the applicable regulations.',
      userId: randomUUID(),
    });
    repository.findById.mockResolvedValue(skill);
    await expect(
      useCase.execute({ skillId: skill.id, thread }),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
  });

  it('returns a skill linked into the thread workspace after execution checks', async () => {
    const { useCase, thread, repository, authorization, links } = fixture();
    const linked = new PersonalSkill({
      name: 'Protokoll zusammenfassen',
      shortDescription: 'Fasst Besprechungen zusammen',
      instructions: 'Fasse zusammen.',
      userId: randomUUID(),
    });
    repository.findByIds.mockResolvedValue([]);
    links.isLinked.mockResolvedValue(true);
    repository.findById.mockResolvedValue(linked);

    await expect(useCase.execute({ skillId: linked.id, thread })).resolves.toBe(
      linked,
    );
    expect(links.isLinked).toHaveBeenCalledWith(thread.workspaceId, linked.id);
    expect(authorization.requireExecution).toHaveBeenCalledWith(
      linked,
      thread.id,
    );
  });

  it('does not treat a skill linked elsewhere as part of the thread workspace', async () => {
    const { useCase, thread, repository } = fixture();
    const foreign = new PersonalSkill({
      name: 'Fremd',
      shortDescription: 'Fremde Fähigkeit',
      instructions: 'Nicht hier.',
      userId: randomUUID(),
    });
    repository.findByIds.mockResolvedValue([]);
    repository.findById.mockResolvedValue(foreign);

    await expect(
      useCase.execute({ skillId: foreign.id, thread }),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
  });
});
