import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  TEST_WORKSPACE_ID,
  aWorkspace,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { FindWorkspaceQuery } from './find-workspace.query';
import { FindWorkspaceUseCase } from './find-workspace.use-case';

describe('FindWorkspaceUseCase', () => {
  it('returns a workspace available with use access', async () => {
    const workspace = aWorkspace();
    const accessService = {
      requireRole: jest.fn().mockResolvedValue({ workspace }),
    };
    const module = await Test.createTestingModule({
      providers: [
        FindWorkspaceUseCase,
        {
          provide: getLoggerToken(FindWorkspaceUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        { provide: WorkspaceAccessService, useValue: accessService },
      ],
    }).compile();
    const useCase = module.get(FindWorkspaceUseCase);

    await expect(
      useCase.execute(new FindWorkspaceQuery(TEST_WORKSPACE_ID)),
    ).resolves.toBe(workspace);
    expect(accessService.requireRole).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceRole.USE,
    );
  });
});
