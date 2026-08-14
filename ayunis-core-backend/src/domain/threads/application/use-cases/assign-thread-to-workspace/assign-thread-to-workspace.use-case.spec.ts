import { Test } from '@nestjs/testing';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { getLoggerToken } from 'nestjs-pino';

import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { FindWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/find-workspace/find-workspace.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { AssignThreadToWorkspaceCommand } from './assign-thread-to-workspace.command';
import { AssignThreadToWorkspaceUseCase } from './assign-thread-to-workspace.use-case';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const THREAD_ID = '22222222-2222-4222-8222-222222222222' as UUID;
const WORKSPACE_ID = '33333333-3333-4333-8333-333333333333' as UUID;

describe('AssignThreadToWorkspaceUseCase', () => {
  let useCase: AssignThreadToWorkspaceUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let findWorkspaceUseCase: jest.Mocked<FindWorkspaceUseCase>;

  async function setup(context: { userId?: UUID } = { userId: USER_ID }) {
    threadsRepository = {
      assignToWorkspace: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ThreadsRepository>;
    findWorkspaceUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<FindWorkspaceUseCase>;

    const module = await Test.createTestingModule({
      providers: [
        AssignThreadToWorkspaceUseCase,
        {
          provide: getLoggerToken(AssignThreadToWorkspaceUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        { provide: ThreadsRepository, useValue: threadsRepository },
        { provide: FindWorkspaceUseCase, useValue: findWorkspaceUseCase },
        {
          provide: ContextService,
          useValue: { get: jest.fn(() => context.userId) },
        },
      ],
    }).compile();
    useCase = module.get(AssignThreadToWorkspaceUseCase);
  }

  beforeEach(async () => {
    await setup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('files the thread under the workspace', async () => {
    await useCase.execute(
      new AssignThreadToWorkspaceCommand({
        threadId: THREAD_ID,
        workspaceId: WORKSPACE_ID,
      }),
    );

    expect(threadsRepository.assignToWorkspace).toHaveBeenCalledWith({
      threadId: THREAD_ID,
      userId: USER_ID,
      workspaceId: WORKSPACE_ID,
    });
  });

  it('detaches the thread when workspaceId is null', async () => {
    await useCase.execute(
      new AssignThreadToWorkspaceCommand({
        threadId: THREAD_ID,
        workspaceId: null,
      }),
    );

    expect(findWorkspaceUseCase.execute).not.toHaveBeenCalled();
    expect(threadsRepository.assignToWorkspace).toHaveBeenCalledWith({
      threadId: THREAD_ID,
      userId: USER_ID,
      workspaceId: null,
    });
  });

  it('refuses a workspace the caller does not own', async () => {
    findWorkspaceUseCase.execute.mockRejectedValue(
      new WorkspaceNotFoundError(WORKSPACE_ID),
    );

    await expect(
      useCase.execute(
        new AssignThreadToWorkspaceCommand({
          threadId: THREAD_ID,
          workspaceId: WORKSPACE_ID,
        }),
      ),
    ).rejects.toThrow(WorkspaceNotFoundError);
    expect(threadsRepository.assignToWorkspace).not.toHaveBeenCalled();
  });

  it('refuses a thread the caller does not own', async () => {
    threadsRepository.assignToWorkspace.mockRejectedValue(
      new ThreadNotFoundError(THREAD_ID, USER_ID),
    );

    await expect(
      useCase.execute(
        new AssignThreadToWorkspaceCommand({
          threadId: THREAD_ID,
          workspaceId: WORKSPACE_ID,
        }),
      ),
    ).rejects.toThrow(ThreadNotFoundError);
  });

  it('rejects an unauthenticated caller', async () => {
    await setup({});

    await expect(
      useCase.execute(
        new AssignThreadToWorkspaceCommand({
          threadId: THREAD_ID,
          workspaceId: null,
        }),
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
  });
});
