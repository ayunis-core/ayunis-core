import { Test } from '@nestjs/testing';
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
import { FindAllWorkspacesQuery } from './find-all-workspaces.query';
import { Paginated } from 'src/common/pagination/paginated.entity';

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

  beforeEach(async () => {
    await setup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the caller’s workspaces with their chat and resource stats', async () => {
    const workspace = aWorkspace();
    repository.findAllByUserId.mockResolvedValue(
      new Paginated({ data: [workspace], limit: 20, offset: 0, total: 1 }),
    );
    repository.getListStats.mockResolvedValue(
      new Map([
        [
          workspace.id,
          {
            chatCount: 3,
            lastActivityAt: null,
            skillCount: 2,
            knowledgeBaseCount: 5,
          },
        ],
      ]),
    );

    await expect(useCase.execute()).resolves.toEqual(
      new Paginated({
        data: [
          {
            workspace,
            chatCount: 3,
            skillCount: 2,
            knowledgeBaseCount: 5,
            lastActivityAt: workspace.updatedAt,
          },
        ],
        limit: 20,
        offset: 0,
        total: 1,
      }),
    );
    expect(repository.findAllByUserId).toHaveBeenCalledWith(
      TEST_USER_ID,
      expect.objectContaining({ limit: 20, offset: 0, sort: 'updatedAt' }),
    );
  });

  it('reports zero chats for a workspace without stats', async () => {
    const workspace = aWorkspace();
    repository.findAllByUserId.mockResolvedValue(
      new Paginated({ data: [workspace], limit: 20, offset: 0, total: 1 }),
    );

    const { data } = await useCase.execute();
    const [item] = data;

    expect(item.chatCount).toBe(0);
    expect(item.lastActivityAt).toEqual(workspace.updatedAt);
  });

  it('reports zero skills and knowledge bases for a workspace without resources', async () => {
    const workspace = aWorkspace();
    repository.findAllByUserId.mockResolvedValue(
      new Paginated({ data: [workspace], limit: 20, offset: 0, total: 1 }),
    );

    const { data } = await useCase.execute();
    const [item] = data;

    expect(item.skillCount).toBe(0);
    expect(item.knowledgeBaseCount).toBe(0);
    expect(repository.getListStats).toHaveBeenCalledWith([workspace.id]);
  });

  it('surfaces chat activity newer than the last edit', async () => {
    const workspace = aWorkspace({
      updatedAt: new Date('2026-08-02T10:00:00.000Z'),
    });
    const chatActivity = new Date('2026-08-05T10:00:00.000Z');
    repository.findAllByUserId.mockResolvedValue(
      new Paginated({ data: [workspace], limit: 20, offset: 0, total: 1 }),
    );
    repository.getListStats.mockResolvedValue(
      new Map([
        [
          workspace.id,
          {
            chatCount: 1,
            lastActivityAt: chatActivity,
            skillCount: 0,
            knowledgeBaseCount: 0,
          },
        ],
      ]),
    );

    const { data } = await useCase.execute();
    const [item] = data;

    expect(item.lastActivityAt).toEqual(chatActivity);
  });

  it('keeps the edit timestamp when it is newer than chat activity', async () => {
    const workspace = aWorkspace({
      updatedAt: new Date('2026-08-09T10:00:00.000Z'),
    });
    repository.findAllByUserId.mockResolvedValue(
      new Paginated({ data: [workspace], limit: 20, offset: 0, total: 1 }),
    );
    repository.getListStats.mockResolvedValue(
      new Map([
        [
          workspace.id,
          {
            chatCount: 1,
            lastActivityAt: new Date('2026-08-05T10:00:00.000Z'),
            skillCount: 0,
            knowledgeBaseCount: 0,
          },
        ],
      ]),
    );

    const { data } = await useCase.execute();
    const [item] = data;

    expect(item.lastActivityAt).toEqual(workspace.updatedAt);
  });

  it('rejects an unauthenticated caller', async () => {
    await setup(createMockContextService({}));

    await expect(useCase.execute(new FindAllWorkspacesQuery())).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });
});
