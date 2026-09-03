import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import {
  aWorkspace,
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { FindWorkspaceQuery } from './find-workspace.query';
import { FindWorkspaceUseCase } from './find-workspace.use-case';

describe('FindWorkspaceUseCase', () => {
  let useCase: FindWorkspaceUseCase;
  let repository: jest.Mocked<WorkspacesRepository>;

  beforeEach(async () => {
    repository = createMockWorkspacesRepository();
    const module = await Test.createTestingModule({
      providers: [
        FindWorkspaceUseCase,
        { provide: WorkspacesRepository, useValue: repository },
        { provide: ContextService, useValue: createMockContextService() },
      ],
    }).compile();
    useCase = module.get(FindWorkspaceUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the workspace scoped to the caller', async () => {
    const workspace = aWorkspace();
    repository.findById.mockResolvedValue(workspace);

    await expect(
      useCase.execute(new FindWorkspaceQuery(TEST_WORKSPACE_ID)),
    ).resolves.toBe(workspace);
    expect(repository.findById).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_WORKSPACE_ID,
    );
  });

  it('throws when the workspace does not belong to the caller', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(new FindWorkspaceQuery(TEST_WORKSPACE_ID)),
    ).rejects.toThrow(WorkspaceNotFoundError);
  });
});
