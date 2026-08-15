import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContextService } from 'src/common/context/services/context.service';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import {
  aWorkspace,
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_ORG_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { DeleteWorkspaceCommand } from './delete-workspace.command';
import { DeleteWorkspaceUseCase } from './delete-workspace.use-case';

describe('DeleteWorkspaceUseCase', () => {
  let useCase: DeleteWorkspaceUseCase;
  let repository: jest.Mocked<WorkspacesRepository>;
  let eventEmitter: { emitAsync: jest.Mock };

  beforeEach(async () => {
    repository = createMockWorkspacesRepository();
    eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) };
    const module = await Test.createTestingModule({
      providers: [
        DeleteWorkspaceUseCase,
        {
          provide: getLoggerToken(DeleteWorkspaceUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        { provide: WorkspacesRepository, useValue: repository },
        { provide: ContextService, useValue: createMockContextService() },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();
    useCase = module.get(DeleteWorkspaceUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('announces the deletion before removing the row', async () => {
    repository.findById.mockResolvedValue(aWorkspace());
    const callOrder: string[] = [];
    eventEmitter.emitAsync.mockImplementation(() => {
      callOrder.push('event');
      return Promise.resolve([]);
    });
    repository.delete.mockImplementation(() => {
      callOrder.push('delete');
      return Promise.resolve();
    });

    await useCase.execute(new DeleteWorkspaceCommand(TEST_WORKSPACE_ID));

    expect(callOrder).toEqual(['event', 'delete']);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      WorkspaceDeletionRequestedEvent.EVENT_NAME,
      expect.objectContaining({
        workspaceId: TEST_WORKSPACE_ID,
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      }),
    );
  });

  it('runs deferred listener cleanup only after the row delete succeeds', async () => {
    repository.findById.mockResolvedValue(aWorkspace());
    const cleanup = jest.fn().mockResolvedValue(undefined);
    eventEmitter.emitAsync.mockImplementation(
      (_name: string, event: WorkspaceDeletionRequestedEvent) => {
        event.deferCleanup('purge thread storage', cleanup);
        return Promise.resolve([]);
      },
    );

    await useCase.execute(new DeleteWorkspaceCommand(TEST_WORKSPACE_ID));

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(repository.delete).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_WORKSPACE_ID,
    );
  });

  it('does not run cleanup when the row delete fails', async () => {
    repository.findById.mockResolvedValue(aWorkspace());
    const cleanup = jest.fn().mockResolvedValue(undefined);
    eventEmitter.emitAsync.mockImplementation(
      (_name: string, event: WorkspaceDeletionRequestedEvent) => {
        event.deferCleanup('purge thread storage', cleanup);
        return Promise.resolve([]);
      },
    );
    repository.delete.mockRejectedValue(new Error('constraint violation'));

    await expect(
      useCase.execute(new DeleteWorkspaceCommand(TEST_WORKSPACE_ID)),
    ).rejects.toThrow();
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('throws when the workspace does not belong to the caller', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(new DeleteWorkspaceCommand(TEST_WORKSPACE_ID)),
    ).rejects.toThrow(WorkspaceNotFoundError);
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
