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

  it('returns the caller’s workspaces with their chat stats', async () => {
    const workspace = aWorkspace();
    repository.findAllByUserId.mockResolvedValue([workspace]);
    repository.getThreadStats.mockResolvedValue(
      new Map([[workspace.id, { chatCount: 3, lastActivityAt: null }]]),
    );

    await expect(useCase.execute()).resolves.toEqual([
      { workspace, chatCount: 3, lastActivityAt: workspace.updatedAt },
    ]);
    expect(repository.findAllByUserId).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it('reports zero chats for a workspace without stats', async () => {
    const workspace = aWorkspace();
    repository.findAllByUserId.mockResolvedValue([workspace]);

    const [item] = await useCase.execute();

    expect(item.chatCount).toBe(0);
    expect(item.lastActivityAt).toEqual(workspace.updatedAt);
  });

  it('surfaces chat activity newer than the last edit', async () => {
    const workspace = aWorkspace({
      updatedAt: new Date('2026-08-02T10:00:00.000Z'),
    });
    const chatActivity = new Date('2026-08-05T10:00:00.000Z');
    repository.findAllByUserId.mockResolvedValue([workspace]);
    repository.getThreadStats.mockResolvedValue(
      new Map([[workspace.id, { chatCount: 1, lastActivityAt: chatActivity }]]),
    );

    const [item] = await useCase.execute();

    expect(item.lastActivityAt).toEqual(chatActivity);
  });

  it('keeps the edit timestamp when it is newer than chat activity', async () => {
    const workspace = aWorkspace({
      updatedAt: new Date('2026-08-09T10:00:00.000Z'),
    });
    repository.findAllByUserId.mockResolvedValue([workspace]);
    repository.getThreadStats.mockResolvedValue(
      new Map([
        [
          workspace.id,
          {
            chatCount: 1,
            lastActivityAt: new Date('2026-08-05T10:00:00.000Z'),
          },
        ],
      ]),
    );

    const [item] = await useCase.execute();

    expect(item.lastActivityAt).toEqual(workspace.updatedAt);
  });

  it('rejects an unauthenticated caller', async () => {
    await setup(createMockContextService({}));

    await expect(useCase.execute()).rejects.toThrow(UnauthorizedAccessError);
  });
});
