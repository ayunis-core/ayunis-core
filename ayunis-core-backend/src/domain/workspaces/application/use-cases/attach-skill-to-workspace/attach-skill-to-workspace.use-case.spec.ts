import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { TEST_WORKSPACE_ID } from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { AttachSkillToWorkspaceCommand } from './attach-skill-to-workspace.command';
import { AttachSkillToWorkspaceUseCase } from './attach-skill-to-workspace.use-case';

describe('AttachSkillToWorkspaceUseCase', () => {
  it('attaches an accessible skill with edit access', async () => {
    const skillId = randomUUID();
    const repository = { attachSkill: jest.fn().mockResolvedValue(undefined) };
    const skillAccessService = {
      findAccessibleSkill: jest.fn().mockResolvedValue({ id: skillId }),
    };
    const accessService = { requireRole: jest.fn().mockResolvedValue({}) };
    const useCase = new AttachSkillToWorkspaceUseCase(
      createPinoLoggerMock(),
      repository as never,
      skillAccessService as never,
      accessService as never,
    );

    await expect(
      useCase.execute(
        new AttachSkillToWorkspaceCommand(TEST_WORKSPACE_ID, skillId),
      ),
    ).resolves.toBeUndefined();
    expect(accessService.requireRole).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceRole.EDIT,
    );
    expect(repository.attachSkill).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      skillId,
    );
  });
});
