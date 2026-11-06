import { randomUUID } from 'crypto';
import type { GetMcpIntegrationsByIdsUseCase } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.use-case';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { ListSkillMcpIntegrationsQuery } from './list-skill-mcp-integrations.query';
import { ListSkillMcpIntegrationsUseCase } from './list-skill-mcp-integrations.use-case';

describe(ListSkillMcpIntegrationsUseCase.name, () => {
  const integrationId = randomUUID();
  const params = {
    name: 'Council minutes',
    shortDescription: 'Drafts minutes.',
    instructions: 'Summarise.',
    mcpIntegrationIds: [integrationId],
  };

  function setup(skill: unknown) {
    const repository = { findById: jest.fn().mockResolvedValue(skill) };
    const authorization = { requireRead: jest.fn() };
    const integrations = [{ id: integrationId }];
    const getIntegrations = {
      execute: jest.fn().mockResolvedValue(integrations),
    };
    const useCase = new ListSkillMcpIntegrationsUseCase(
      repository as unknown as SkillRepository,
      getIntegrations as unknown as GetMcpIntegrationsByIdsUseCase,
      authorization as unknown as SkillAuthorizationService,
    );
    return { authorization, getIntegrations, integrations, useCase };
  }

  it.each([
    new PersonalSkill({ ...params, userId: randomUUID() }),
    new TeamSkill({ ...params, teamId: randomUUID() }),
  ])('lists integrations of a readable skill', async (skill) => {
    const { useCase, authorization, integrations } = setup(skill);

    await expect(
      useCase.execute(new ListSkillMcpIntegrationsQuery(skill.id)),
    ).resolves.toBe(integrations);
    expect(authorization.requireRead).toHaveBeenCalledWith(skill);
  });

  it('does not list integrations the reader may not see', async () => {
    const skill = new TeamSkill({ ...params, teamId: randomUUID() });
    const { useCase, authorization, getIntegrations } = setup(skill);
    authorization.requireRead.mockRejectedValue(
      new SkillNotFoundError(skill.id),
    );

    await expect(
      useCase.execute(new ListSkillMcpIntegrationsQuery(skill.id)),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
    expect(getIntegrations.execute).not.toHaveBeenCalled();
  });

  it('does not list integrations for workspace skills', async () => {
    const skill = new WorkspaceSkill({ ...params, workspaceId: randomUUID() });
    const { useCase } = setup(skill);

    await expect(
      useCase.execute(new ListSkillMcpIntegrationsQuery(skill.id)),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
  });

  it('fails for an unknown skill', async () => {
    const { useCase } = setup(null);

    await expect(
      useCase.execute(new ListSkillMcpIntegrationsQuery(randomUUID())),
    ).rejects.toBeInstanceOf(SkillNotFoundError);
  });
});
