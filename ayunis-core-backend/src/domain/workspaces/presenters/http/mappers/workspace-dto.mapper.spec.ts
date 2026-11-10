import { Paginated } from 'src/common/pagination/paginated.entity';
import { aWorkspace } from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccess } from 'src/domain/workspaces/application/models/workspace-access.model';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { WorkspaceDtoMapper } from './workspace-dto.mapper';

describe('WorkspaceDtoMapper', () => {
  const mapper = new WorkspaceDtoMapper();

  it("maps a paginated workspace list with chat activity and the caller's workspace-scoped permissions", () => {
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
            access: new WorkspaceAccess(UserRole.MANAGER, [
              Permission.MANAGE_SKILLS,
              Permission.MANAGE_WORKSPACE,
            ]),
            chatCount: 4,
            skillCount: 2,
            knowledgeBaseCount: 3,
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
          role: UserRole.MANAGER,
          permissions: [Permission.MANAGE_WORKSPACE],
          chatCount: 4,
          skillCount: 2,
          knowledgeBaseCount: 3,
          lastActivityAt: lastActivityAt.toISOString(),
        },
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    });
  });
});
