import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { SkillAccessService } from './skill-access.service';
import type { SkillAuthorizationService } from './skill-authorization.service';

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
  const shares = { execute: jest.fn().mockResolvedValue(null) };
  const context = {
    get: jest.fn((key: string) => (key === 'userId' ? userId : orgId)),
  };
  const authorization = {
    requireExecution: jest.fn().mockResolvedValue(undefined),
  };
  const service = new SkillAccessService(
    repository as unknown as SkillRepository,
    shares as unknown as FindShareByEntityUseCase,
    context as unknown as ContextService,
    authorization as unknown as SkillAuthorizationService,
  );
  return {
    service,
    skill,
    thread,
    repository,
    context,
    shares,
    authorization,
  };
}

describe('workspace skill activation access', () => {
  it('permits an enabled skill scoped to the owned thread workspace', async () => {
    const { service, skill, thread, repository, authorization } = fixture();
    await expect(service.findActivatableSkill(skill.id, thread)).resolves.toBe(
      skill,
    );
    expect(repository.findByIds).toHaveBeenCalledWith(
      [skill.id],
      thread.workspaceId,
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

  it('rejects workspace execution denied by the centralized policy', async () => {
    const { service, skill, thread, authorization, repository } = fixture();
    authorization.requireExecution.mockRejectedValue(
      new SkillNotFoundError(skill.id),
    );
    await expect(
      service.findActivatableSkill(skill.id, thread),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
    expect(repository.getWorkspaceSkillStates).not.toHaveBeenCalled();
  });

  it.each([false, undefined])(
    'rejects disabled or missing activation state %s',
    async (isActive) => {
      const { service, skill, thread, repository } = fixture();
      repository.getWorkspaceSkillStates.mockResolvedValue(
        new Map(
          isActive === undefined
            ? []
            : [[skill.id, { isActive, isPinned: false }]],
        ),
      );
      await expect(
        service.findActivatableSkill(skill.id, thread),
      ).rejects.toBeInstanceOf(SkillNotFoundError);
    },
  );

  it('does not activate a skill outside the thread workspace', async () => {
    const { service, skill, thread, repository } = fixture();
    repository.findByIds.mockResolvedValue([]);
    await expect(
      service.findActivatableSkill(skill.id, thread),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
    expect(repository.getWorkspaceSkillStates).not.toHaveBeenCalled();
  });

  it('does not activate a workspace skill on a standalone thread', async () => {
    const { service, skill, thread, repository } = fixture();
    thread.workspaceId = null;
    await expect(
      service.findActivatableSkill(skill.id, thread),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
    expect(repository.findByIds).not.toHaveBeenCalled();
  });

  it('rejects another user’s thread before looking up resources', async () => {
    const { service, skill, thread, repository } = fixture();
    thread.userId = randomUUID();
    await expect(
      service.findActivatableSkill(skill.id, thread),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.findByIds).not.toHaveBeenCalled();
  });
});
