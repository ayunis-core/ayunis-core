import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { WorkspaceSkillLinkRepository } from 'src/domain/skills/application/ports/workspace-skill-link.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { LinkSkillsToWorkspaceCommand } from './link-skills-to-workspace.command';
import { LinkSkillsToWorkspaceUseCase } from './link-skills-to-workspace.use-case';

function setup() {
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const own = new PersonalSkill({
    name: 'Protokoll zusammenfassen',
    shortDescription: 'Fasst Besprechungen zusammen',
    instructions: 'Fasse zusammen.',
    userId,
  });
  const foreign = new PersonalSkill({
    name: 'Fremd',
    shortDescription: 'Gehört jemand anderem',
    instructions: 'Nicht verknüpfbar.',
    userId: randomUUID(),
  });
  const links = { link: jest.fn() };
  const repository = { findByIds: jest.fn().mockResolvedValue([own]) };
  const authorization = {
    requireLinkable: jest.fn(async (skill: PersonalSkill) => {
      if (skill.userId !== userId) throw new SkillNotFoundError(skill.id);
    }),
  };
  const workspaceWrite = { execute: jest.fn() };
  const useCase = new LinkSkillsToWorkspaceUseCase(
    links as unknown as WorkspaceSkillLinkRepository,
    repository as unknown as SkillRepository,
    authorization as unknown as SkillAuthorizationService,
    {
      get: jest.fn(getFromUserContext({ userId, orgId: randomUUID() })),
    } as unknown as ContextService,
    workspaceWrite as unknown as AssertWorkspaceWriteAccessUseCase,
  );
  return {
    useCase,
    userId,
    workspaceId,
    own,
    foreign,
    links,
    repository,
    workspaceWrite,
  };
}

describe(LinkSkillsToWorkspaceUseCase.name, () => {
  it('links usable skills on behalf of the caller', async () => {
    const { useCase, workspaceId, own, links, userId } = setup();

    await useCase.execute(
      new LinkSkillsToWorkspaceCommand(workspaceId, [own.id, own.id]),
    );

    expect(links.link).toHaveBeenCalledWith(workspaceId, [own.id], userId);
  });

  it('links nothing when one of the skills may not be linked', async () => {
    const { useCase, workspaceId, own, foreign, links, repository } = setup();
    repository.findByIds.mockResolvedValue([own, foreign]);

    await expect(
      useCase.execute(
        new LinkSkillsToWorkspaceCommand(workspaceId, [own.id, foreign.id]),
      ),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
    expect(links.link).not.toHaveBeenCalled();
  });

  it('links nothing when a skill does not exist', async () => {
    const { useCase, workspaceId, links } = setup();

    await expect(
      useCase.execute(
        new LinkSkillsToWorkspaceCommand(workspaceId, [randomUUID()]),
      ),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
    expect(links.link).not.toHaveBeenCalled();
  });

  it('requires write access to the workspace first', async () => {
    const { useCase, workspaceId, own, links, workspaceWrite, repository } =
      setup();
    workspaceWrite.execute.mockRejectedValue(
      new WorkspaceNotFoundError(workspaceId),
    );

    await expect(
      useCase.execute(new LinkSkillsToWorkspaceCommand(workspaceId, [own.id])),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
    expect(repository.findByIds).not.toHaveBeenCalled();
    expect(links.link).not.toHaveBeenCalled();
  });
});
