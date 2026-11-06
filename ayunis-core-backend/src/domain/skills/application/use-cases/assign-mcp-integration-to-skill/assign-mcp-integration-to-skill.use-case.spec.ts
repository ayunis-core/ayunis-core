jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => (_t: unknown, _p: string, d: PropertyDescriptor) => d,
}));

import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { AssignMcpIntegrationToSkillCommand } from './assign-mcp-integration-to-skill.command';
import { AssignMcpIntegrationToSkillUseCase } from './assign-mcp-integration-to-skill.use-case';

describe(AssignMcpIntegrationToSkillUseCase.name, () => {
  const orgId = randomUUID();
  const integration = { id: randomUUID(), enabled: true, orgId };
  const params = {
    name: 'Council minutes',
    shortDescription: 'Drafts minutes.',
    instructions: 'Summarise.',
  };

  function setup(skill: unknown) {
    const repository = {
      findById: jest.fn().mockResolvedValue(skill),
      update: jest
        .fn()
        .mockImplementation((updated) => Promise.resolve(updated)),
    };
    const authorization = { requireWrite: jest.fn() };
    const useCase = new AssignMcpIntegrationToSkillUseCase(
      repository as unknown as SkillRepository,
      {
        findById: jest.fn().mockResolvedValue(integration),
      } as unknown as McpIntegrationsRepositoryPort,
      {
        get: jest.fn(getFromUserContext({ orgId })),
      } as unknown as ContextService,
      authorization as unknown as SkillAuthorizationService,
    );
    return { repository, authorization, useCase };
  }

  it('assigns an integration to a team skill the caller manages', async () => {
    const skill = new TeamSkill({ ...params, teamId: randomUUID() });
    const { useCase, authorization } = setup(skill);

    const updated = await useCase.execute(
      new AssignMcpIntegrationToSkillCommand(skill.id, integration.id),
    );

    expect(authorization.requireWrite).toHaveBeenCalledWith(skill);
    expect(updated).toBeInstanceOf(TeamSkill);
    expect(updated.mcpIntegrationIds).toEqual([integration.id]);
  });

  it('does not assign when the caller may not manage the skill', async () => {
    const skill = new TeamSkill({ ...params, teamId: randomUUID() });
    const { useCase, authorization, repository } = setup(skill);
    authorization.requireWrite.mockRejectedValue(new UnauthorizedAccessError());

    await expect(
      useCase.execute(
        new AssignMcpIntegrationToSkillCommand(skill.id, integration.id),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('keeps integrations off workspace skills', async () => {
    const skill = new WorkspaceSkill({ ...params, workspaceId: randomUUID() });
    const { useCase, repository } = setup(skill);

    await expect(
      useCase.execute(
        new AssignMcpIntegrationToSkillCommand(skill.id, integration.id),
      ),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
