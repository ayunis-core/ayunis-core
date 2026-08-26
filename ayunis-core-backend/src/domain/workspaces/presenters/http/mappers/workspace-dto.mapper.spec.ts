import { Paginated } from 'src/common/pagination/paginated.entity';
import { aWorkspace } from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { WorkspaceDtoMapper } from './workspace-dto.mapper';

describe('WorkspaceDtoMapper', () => {
  const mapper = new WorkspaceDtoMapper();

  it('maps detail access metadata when provided', () => {
    const workspace = aWorkspace();

    expect(
      mapper.toDto(workspace, {
        accessLevel: WorkspaceAccessLevel.USE,
        isOwner: false,
      }),
    ).toMatchObject({ accessLevel: WorkspaceAccessLevel.USE, isOwner: false });
  });

  it('maps a paginated workspace list with chat activity metadata', () => {
    const workspace = aWorkspace({
      name: 'Council Documents',
      description: 'Municipal documents',
    });
    const lastActivityAt = new Date('2026-08-20T10:15:00.000Z');

    const result = mapper.toPaginatedDto(
      new Paginated({
        data: [
          {
            workspace,
            accessLevel: WorkspaceAccessLevel.EDIT,
            isOwner: true,
            chatCount: 4,
            lastActivityAt,
          },
        ],
        limit: 20,
        offset: 0,
        total: 1,
      }),
    );

    expect(result).toEqual({
      data: [
        {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          instruction: workspace.instruction,
          icon: workspace.icon,
          color: workspace.color,
          createdAt: workspace.createdAt.toISOString(),
          updatedAt: workspace.updatedAt.toISOString(),
          accessLevel: WorkspaceAccessLevel.EDIT,
          isOwner: true,
          chatCount: 4,
          lastActivityAt: lastActivityAt.toISOString(),
        },
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    });
  });
});
