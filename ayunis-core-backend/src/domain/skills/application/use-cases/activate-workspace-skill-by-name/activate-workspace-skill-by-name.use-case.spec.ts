import { randomUUID } from 'crypto';
import type { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillActivationService } from 'src/domain/skills/application/services/skill-activation.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { ActivateWorkspaceSkillByNameUseCase } from './activate-workspace-skill-by-name.use-case';

function fixture() {
  const thread = new Thread({
    userId: randomUUID(),
    workspaceId: randomUUID(),
    messages: [],
  });
  const skill = new WorkspaceSkill({
    workspaceId: thread.workspaceId!,
    name: 'Research',
    shortDescription: 'Research',
    instructions: 'Instructions',
  });
  const findThread = { execute: jest.fn().mockResolvedValue({ thread }) };
  const repository = {
    findByNameAndWorkspace: jest.fn().mockResolvedValue(skill),
  };
  const activation = {
    activateOnThread: jest.fn().mockResolvedValue({
      instructions: skill.instructions,
      skillName: skill.name,
    }),
  };
  const useCase = new ActivateWorkspaceSkillByNameUseCase(
    findThread as unknown as FindThreadUseCase,
    repository as unknown as SkillRepository,
    activation as unknown as SkillActivationService,
  );
  return {
    useCase,
    thread,
    skill,
    findThread,
    repository,
    activation,
    query: { threadId: thread.id, name: skill.name },
  };
}

describe('ActivateWorkspaceSkillByNameUseCase', () => {
  it('resolves the name only within the authorized thread’s workspace and uses regular activation', async () => {
    const { useCase, query, skill, thread, repository, activation } = fixture();
    await expect(useCase.execute(query)).resolves.toEqual({
      instructions: skill.instructions,
      skillName: skill.name,
    });
    expect(repository.findByNameAndWorkspace).toHaveBeenCalledWith(
      skill.name,
      thread.workspaceId,
    );
    expect(activation.activateOnThread).toHaveBeenCalledWith(skill.id, thread);
  });

  it('rejects a thread without a workspace', async () => {
    const { useCase, query, thread, repository, activation } = fixture();
    thread.workspaceId = null;
    await expect(useCase.execute(query)).rejects.toBeInstanceOf(
      SkillNotFoundError,
    );
    expect(repository.findByNameAndWorkspace).not.toHaveBeenCalled();
    expect(activation.activateOnThread).not.toHaveBeenCalled();
  });

  it('does not fall back to another workspace or a personal skill when the name is missing', async () => {
    const { useCase, query, repository, activation } = fixture();
    repository.findByNameAndWorkspace.mockResolvedValue(null);
    await expect(useCase.execute(query)).rejects.toBeInstanceOf(
      SkillNotFoundError,
    );
    expect(activation.activateOnThread).not.toHaveBeenCalled();
  });

  it('preserves thread authorization failures without reading the skill', async () => {
    const { useCase, query, findThread, repository } = fixture();
    findThread.execute.mockRejectedValue(new UnauthorizedAccessError());
    await expect(useCase.execute(query)).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
    expect(repository.findByNameAndWorkspace).not.toHaveBeenCalled();
  });

  it('preserves disabled-skill errors from activation', async () => {
    const { useCase, query, activation } = fixture();
    activation.activateOnThread.mockRejectedValue(
      new SkillNotFoundError(query.name),
    );
    await expect(useCase.execute(query)).rejects.toBeInstanceOf(
      SkillNotFoundError,
    );
  });

  it('wraps unexpected failures', async () => {
    const { useCase, query, repository } = fixture();
    repository.findByNameAndWorkspace.mockRejectedValue(
      new Error('database unavailable'),
    );
    await expect(useCase.execute(query)).rejects.toBeInstanceOf(
      UnexpectedSkillError,
    );
  });
});
