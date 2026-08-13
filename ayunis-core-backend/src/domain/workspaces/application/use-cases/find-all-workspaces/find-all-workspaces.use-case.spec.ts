import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  aWorkspace,
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_USER_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { FindAllWorkspacesUseCase } from './find-all-workspaces.use-case';

describe('FindAllWorkspacesUseCase', () => {
  let useCase: FindAllWorkspacesUseCase;
  let repository: jest.Mocked<WorkspacesRepository>;

  async function setup(contextService = createMockContextService()) {
    repository = createMockWorkspacesRepository();
    const module = await Test.createTestingModule({
      providers: [
        FindAllWorkspacesUseCase,
        { provide: WorkspacesRepository, useValue: repository },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();
    useCase = module.get(FindAllWorkspacesUseCase);
  }

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  beforeEach(async () => {
    await setup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the caller’s workspaces', async () => {
    const workspaces = [aWorkspace()];
    repository.findAllByUserId.mockResolvedValue(workspaces);

    await expect(useCase.execute()).resolves.toBe(workspaces);
    expect(repository.findAllByUserId).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it('rejects an unauthenticated caller', async () => {
    await setup(createMockContextService({}));

    await expect(useCase.execute()).rejects.toThrow(UnauthorizedAccessError);
  });
});
