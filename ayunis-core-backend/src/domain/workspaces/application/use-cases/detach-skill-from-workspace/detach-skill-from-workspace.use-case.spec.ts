import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { TEST_WORKSPACE_ID } from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { DetachSkillFromWorkspaceCommand } from './detach-skill-from-workspace.command';
import { DetachSkillFromWorkspaceUseCase } from './detach-skill-from-workspace.use-case';

describe('DetachSkillFromWorkspaceUseCase', () => {
  it('detaches a skill with edit access', async () => {
    const skillId = randomUUID();
    const repository = { detachSkill: jest.fn().mockResolvedValue(undefined) };
    const accessService = {
      requireAccessLevel: jest.fn().mockResolvedValue({}),
    };
    const useCase = new DetachSkillFromWorkspaceUseCase(
      createPinoLoggerMock(),
      repository as never,
      accessService as never,
    );

    await expect(
      useCase.execute(
        new DetachSkillFromWorkspaceCommand(TEST_WORKSPACE_ID, skillId),
      ),
    ).resolves.toBeUndefined();
    expect(accessService.requireAccessLevel).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceAccessLevel.EDIT,
    );
    expect(repository.detachSkill).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      skillId,
    );
  });
});
