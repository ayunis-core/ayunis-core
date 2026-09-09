import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { FindThreadsByIdsUseCase } from 'src/domain/threads/application/use-cases/find-threads-by-ids/find-threads-by-ids.use-case';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import type { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { AssertWorkspaceExecutionAccessUseCase } from './assert-workspace-execution-access.use-case';

function setup() {
  const userId = randomUUID();
  const orgId = randomUUID();
  const workspaceId = randomUUID();
  const threadId = randomUUID();
  const readAccess = { execute: jest.fn().mockResolvedValue(undefined) };
  const findThreads = {
    execute: jest
      .fn()
      .mockResolvedValue([
        new Thread({ id: threadId, userId, workspaceId, messages: [] }),
      ]),
  };
  const context = {
    get: jest.fn((key: string) => ({ userId, orgId })[key]),
  };
  return {
    workspaceId,
    threadId,
    userId,
    readAccess,
    findThreads,
    context,
    useCase: new AssertWorkspaceExecutionAccessUseCase(
      readAccess as unknown as AssertWorkspaceReadAccessUseCase,
      findThreads as unknown as FindThreadsByIdsUseCase,
      context as unknown as ContextService,
    ),
  };
}

describe(AssertWorkspaceExecutionAccessUseCase.name, () => {
  it('allows execution through an authenticated thread in the workspace', async () => {
    const { useCase, workspaceId, threadId, userId, findThreads } = setup();
    await expect(
      useCase.execute({ workspaceId, threadId }),
    ).resolves.toBeUndefined();
    expect(findThreads.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId, ids: [threadId] }),
    );
  });

  it('rejects a persisted thread in a different workspace', async () => {
    const { useCase, workspaceId, threadId, findThreads } = setup();
    findThreads.execute.mockResolvedValue([
      new Thread({
        id: threadId,
        userId: randomUUID(),
        workspaceId: randomUUID(),
        messages: [],
      }),
    ]);
    await expect(
      useCase.execute({ workspaceId, threadId }),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
  });

  it('rejects a thread outside the authenticated principal scope', async () => {
    const { useCase, workspaceId, threadId, findThreads } = setup();
    findThreads.execute.mockResolvedValue([]);
    await expect(
      useCase.execute({ workspaceId, threadId }),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
  });

  it.each(['userId', 'orgId'] as const)(
    'requires authenticated %s context',
    async (missing) => {
      const { useCase, workspaceId, threadId, context, findThreads } = setup();
      context.get.mockImplementation((key: string) =>
        key === missing ? undefined : randomUUID(),
      );
      await expect(
        useCase.execute({ workspaceId, threadId }),
      ).rejects.toBeInstanceOf(UnauthorizedAccessError);
      expect(findThreads.execute).not.toHaveBeenCalled();
    },
  );

  it('wraps unexpected thread lookup failures', async () => {
    const { useCase, workspaceId, threadId, findThreads } = setup();
    findThreads.execute.mockRejectedValue(new Error('Database unavailable'));
    await expect(
      useCase.execute({ workspaceId, threadId }),
    ).rejects.toBeInstanceOf(UnexpectedWorkspaceError);
  });
});
