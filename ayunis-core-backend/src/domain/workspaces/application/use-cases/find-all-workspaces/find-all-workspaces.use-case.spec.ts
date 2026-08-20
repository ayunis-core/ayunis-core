import { Paginated } from 'src/common/pagination/paginated.entity';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import {
  aWorkspace,
  createMockWorkspacesRepository,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { FindAllWorkspacesQuery } from './find-all-workspaces.query';
import { FindAllWorkspacesUseCase } from './find-all-workspaces.use-case';

describe('FindAllWorkspacesUseCase', () => {
  it('returns accessible workspaces with effective roles and chat stats', async () => {
    const workspace = aWorkspace();
    const repository = createMockWorkspacesRepository();
    repository.getThreadStats.mockResolvedValue(
      new Map([[workspace.id, { chatCount: 3, lastActivityAt: null }]]),
    );
    const accessService = {
      findAllAccessible: jest.fn().mockResolvedValue(
        new Paginated({
          data: [
            {
              workspace,
              role: WorkspaceRole.EDIT,
              sources: [{ type: 'owner' }],
            },
          ],
          limit: 20,
          offset: 0,
          total: 1,
        }),
      ),
    };
    const useCase = new FindAllWorkspacesUseCase(
      createPinoLoggerMock(),
      repository,
      accessService as never,
    );

    await expect(useCase.execute()).resolves.toEqual(
      new Paginated({
        data: [
          {
            workspace,
            role: WorkspaceRole.EDIT,
            isOwner: true,
            chatCount: 3,
            lastActivityAt: workspace.updatedAt,
          },
        ],
        limit: 20,
        offset: 0,
        total: 1,
      }),
    );
    expect(accessService.findAllAccessible).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0, sort: 'updatedAt' }),
    );
  });

  it('surfaces chat activity newer than the last edit', async () => {
    const workspace = aWorkspace({
      updatedAt: new Date('2026-08-02T10:00:00.000Z'),
    });
    const chatActivity = new Date('2026-08-05T10:00:00.000Z');
    const repository = createMockWorkspacesRepository();
    repository.getThreadStats.mockResolvedValue(
      new Map([[workspace.id, { chatCount: 1, lastActivityAt: chatActivity }]]),
    );
    const accessService = {
      findAllAccessible: jest.fn().mockResolvedValue(
        new Paginated({
          data: [{ workspace, role: WorkspaceRole.USE, sources: [] }],
          limit: 20,
          offset: 0,
          total: 1,
        }),
      ),
    };
    const useCase = new FindAllWorkspacesUseCase(
      createPinoLoggerMock(),
      repository,
      accessService as never,
    );

    const { data } = await useCase.execute(new FindAllWorkspacesQuery());

    expect(data[0]).toMatchObject({
      role: WorkspaceRole.USE,
      isOwner: false,
      chatCount: 1,
      lastActivityAt: chatActivity,
    });
  });
});
