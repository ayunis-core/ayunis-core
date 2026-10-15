import type { UUID } from 'crypto';
import type { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  createMockContextService,
  TEST_ORG_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { FindWorkspacesByIdsQuery } from './find-workspaces-by-ids.query';
import { FindWorkspacesByIdsUseCase } from './find-workspaces-by-ids.use-case';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const WORKSPACE_ID = '22222222-2222-4222-8222-222222222222' as UUID;

describe('FindWorkspacesByIdsUseCase', () => {
  it('returns only workspaces the requested user can open', async () => {
    const workspaces = [{ id: WORKSPACE_ID }];
    const repository = {
      findAllAccessibleByIds: jest.fn().mockResolvedValue(workspaces),
    } as unknown as WorkspacesRepository;
    const useCase = new FindWorkspacesByIdsUseCase(
      repository,
      createMockContextService(),
    );

    await expect(
      useCase.execute(new FindWorkspacesByIdsQuery(USER_ID, [WORKSPACE_ID])),
    ).resolves.toBe(workspaces);
    expect(repository.findAllAccessibleByIds).toHaveBeenCalledWith(
      { userId: USER_ID, orgId: TEST_ORG_ID },
      [WORKSPACE_ID],
    );
  });
});
