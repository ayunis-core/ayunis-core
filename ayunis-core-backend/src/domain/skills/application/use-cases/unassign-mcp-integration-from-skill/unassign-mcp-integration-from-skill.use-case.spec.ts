jest.mock('@nestjs-cls/transactional', () => ({
  Transactional: () => (_t: unknown, _p: string, d: PropertyDescriptor) => d,
}));

import { randomUUID } from 'crypto';
import type { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import type { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { SkillMcpIntegrationNotAssignedError } from 'src/domain/skills/application/skills.errors';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { UnassignMcpIntegrationFromSkillCommand } from './unassign-mcp-integration-from-skill.command';
import { UnassignMcpIntegrationFromSkillUseCase } from './unassign-mcp-integration-from-skill.use-case';

describe(UnassignMcpIntegrationFromSkillUseCase.name, () => {
  const integrationId = randomUUID();
  const skill = new OrgSkill({
    name: 'Press release',
    shortDescription: 'Writes press releases.',
    instructions: 'Use the style guide.',
    orgId: randomUUID(),
    mcpIntegrationIds: [integrationId],
  });

  function setup() {
    const repository = {
      findById: jest.fn().mockResolvedValue(skill),
      update: jest
        .fn()
        .mockImplementation((updated) => Promise.resolve(updated)),
    };
    const authorization = { requireWrite: jest.fn() };
    const useCase = new UnassignMcpIntegrationFromSkillUseCase(
      repository as unknown as SkillRepository,
      authorization as unknown as SkillAuthorizationService,
    );
    return { repository, authorization, useCase };
  }

  it('removes an integration from an org skill the caller manages', async () => {
    const { useCase, authorization } = setup();

    const updated = await useCase.execute(
      new UnassignMcpIntegrationFromSkillCommand(skill.id, integrationId),
    );

    expect(authorization.requireWrite).toHaveBeenCalledWith(skill);
    expect(updated.mcpIntegrationIds).toEqual([]);
  });

  it('rejects removing an integration that is not assigned', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(
        new UnassignMcpIntegrationFromSkillCommand(skill.id, randomUUID()),
      ),
    ).rejects.toBeInstanceOf(SkillMcpIntegrationNotAssignedError);
  });
});
