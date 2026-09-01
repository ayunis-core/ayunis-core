import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { CreateSkillUseCase } from 'src/domain/skills/application/use-cases/create-skill/create-skill.use-case';
import {
  aWorkspace,
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_USER_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { CreateWorkspaceSkillCommand } from './create-workspace-skill.command';
import { CreateWorkspaceSkillUseCase } from './create-workspace-skill.use-case';

describe(CreateWorkspaceSkillUseCase.name, () => {
  it('creates the skill in an owned workspace', async () => {
    const workspaceId = randomUUID();
    const repository = createMockWorkspacesRepository();
    repository.findById.mockResolvedValue(aWorkspace({ id: workspaceId }));
    const createSkillUseCase = {
      execute: jest.fn().mockResolvedValue({ id: randomUUID(), workspaceId }),
    } as unknown as jest.Mocked<CreateSkillUseCase>;
    const useCase = new CreateWorkspaceSkillUseCase(
      createPinoLoggerMock(),
      repository,
      createSkillUseCase,
      createMockContextService(),
    );

    await useCase.execute(
      new CreateWorkspaceSkillCommand(
        workspaceId,
        'Legal research',
        'Researches legal topics.',
        'Use municipal law.',
      ),
    );

    expect(repository.findById).toHaveBeenCalledWith(TEST_USER_ID, workspaceId);
    expect(createSkillUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId, name: 'Legal research' }),
    );
  });
});
