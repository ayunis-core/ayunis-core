import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { GetWorkspaceAccessQuery } from 'src/domain/workspaces/application/use-cases/get-workspace-access/get-workspace-access.query';
import { GetWorkspaceAccessUseCase } from 'src/domain/workspaces/application/use-cases/get-workspace-access/get-workspace-access.use-case';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { TEST_WORKSPACE_ID } from 'src/domain/workspaces/application/testing/workspace.fixtures';

describe('GetWorkspaceAccessUseCase', () => {
  it('returns access after enforcing the requested minimum role', async () => {
    const access = { role: WorkspaceRole.EDIT };
    const service = { requireRole: jest.fn().mockResolvedValue(access) };
    const module = await Test.createTestingModule({
      providers: [
        GetWorkspaceAccessUseCase,
        { provide: WorkspaceAccessService, useValue: service },
        {
          provide: getLoggerToken(GetWorkspaceAccessUseCase.name),
          useValue: { info: jest.fn() },
        },
      ],
    }).compile();
    const useCase = module.get(GetWorkspaceAccessUseCase);

    await expect(
      useCase.execute(
        new GetWorkspaceAccessQuery(TEST_WORKSPACE_ID, WorkspaceRole.EDIT),
      ),
    ).resolves.toBe(access);
    expect(service.requireRole).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceRole.EDIT,
    );
  });
});
