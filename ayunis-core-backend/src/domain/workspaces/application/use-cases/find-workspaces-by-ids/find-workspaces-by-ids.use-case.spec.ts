import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { FindWorkspacesByIdsQuery } from './find-workspaces-by-ids.query';
import { FindWorkspacesByIdsUseCase } from './find-workspaces-by-ids.use-case';

const WORKSPACE_ID = '22222222-2222-4222-8222-222222222222' as const;

describe('FindWorkspacesByIdsUseCase', () => {
  it('returns accessible workspaces requested by id', async () => {
    const workspaces = [{ id: WORKSPACE_ID }];
    const accessService = {
      findAllAccessibleByIds: jest
        .fn()
        .mockResolvedValue(workspaces.map((workspace) => ({ workspace }))),
    } as unknown as WorkspaceAccessService;
    const useCase = new FindWorkspacesByIdsUseCase(
      createPinoLoggerMock(),
      accessService,
    );

    await expect(
      useCase.execute(new FindWorkspacesByIdsQuery([WORKSPACE_ID])),
    ).resolves.toEqual(workspaces);
    expect(accessService.findAllAccessibleByIds).toHaveBeenCalledWith([
      WORKSPACE_ID,
    ]);
  });
});
