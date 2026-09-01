import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { SkillAccessService } from 'src/domain/skills/application/services/skill-access.service';
import type { CreateSkillUseCase } from 'src/domain/skills/application/use-cases/create-skill/create-skill.use-case';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import {
  aWorkspace,
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_USER_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { CopyPersonalSkillToWorkspaceCommand } from './copy-personal-skill-to-workspace.command';
import { CopyPersonalSkillToWorkspaceUseCase } from './copy-personal-skill-to-workspace.use-case';

describe(CopyPersonalSkillToWorkspaceUseCase.name, () => {
  it('copies content and org integrations without personal data dependencies', async () => {
    const workspaceId = randomUUID();
    const sourceId = randomUUID();
    const knowledgeBaseId = randomUUID();
    const mcpIntegrationId = randomUUID();
    const origin = new Skill({
      name: 'Legal research',
      shortDescription: 'Researches legal topics.',
      instructions: 'Use municipal law.',
      userId: TEST_USER_ID,
      sourceIds: [sourceId],
      knowledgeBaseIds: [knowledgeBaseId],
      mcpIntegrationIds: [mcpIntegrationId],
    });
    const repository = createMockWorkspacesRepository();
    repository.findById.mockResolvedValue(aWorkspace({ id: workspaceId }));
    const skillAccessService = {
      findAccessibleSkill: jest.fn().mockResolvedValue(origin),
    } as unknown as jest.Mocked<SkillAccessService>;
    const createSkillUseCase = {
      execute: jest.fn().mockResolvedValue({ id: randomUUID(), workspaceId }),
    } as unknown as jest.Mocked<CreateSkillUseCase>;
    const useCase = new CopyPersonalSkillToWorkspaceUseCase(
      createPinoLoggerMock(),
      repository,
      skillAccessService,
      createSkillUseCase,
      createMockContextService(),
    );

    await useCase.execute(
      new CopyPersonalSkillToWorkspaceCommand(workspaceId, origin.id),
    );

    expect(createSkillUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        mcpIntegrationIds: [mcpIntegrationId],
      }),
    );
    const command = createSkillUseCase.execute.mock.calls[0]?.[0];
    expect(command).not.toHaveProperty('sourceIds');
    expect(command).not.toHaveProperty('knowledgeBaseIds');
    expect(command).not.toHaveProperty('originSkillId');
    expect(command).not.toHaveProperty('importedOriginVersion');
  });
});
