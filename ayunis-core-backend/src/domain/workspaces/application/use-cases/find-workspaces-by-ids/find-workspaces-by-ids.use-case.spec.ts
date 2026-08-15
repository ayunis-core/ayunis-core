import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { UUID } from 'crypto';
import type { WorkspacesRepository } from '../../ports/workspaces-repository.port';
import { FindWorkspacesByIdsQuery } from './find-workspaces-by-ids.query';
import { FindWorkspacesByIdsUseCase } from './find-workspaces-by-ids.use-case';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const WORKSPACE_ID = '22222222-2222-4222-8222-222222222222' as UUID;

describe('FindWorkspacesByIdsUseCase', () => {
  it('returns only workspaces owned by the requested user', async () => {
    const workspaces = [{ id: WORKSPACE_ID }];
    const repository = {
      findAllByIds: jest.fn().mockResolvedValue(workspaces),
    } as unknown as WorkspacesRepository;
    const useCase = new FindWorkspacesByIdsUseCase(
      createPinoLoggerMock(),
      repository,
    );

    await expect(
      useCase.execute(new FindWorkspacesByIdsQuery(USER_ID, [WORKSPACE_ID])),
    ).resolves.toBe(workspaces);
    expect(repository.findAllByIds).toHaveBeenCalledWith(USER_ID, [
      WORKSPACE_ID,
    ]);
  });
});
