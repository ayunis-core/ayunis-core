import type { LinkedWorkspaces } from 'src/domain/workspaces/domain/workspace-link';
import type { LinkedWorkspacesResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-link.dto';

export function toLinkedWorkspacesDto(
  linked: LinkedWorkspaces,
): LinkedWorkspacesResponseDto {
  return {
    total: linked.total,
    workspaces: linked.workspaces.map(({ workspace, linkedBy }) => ({
      id: workspace.id,
      name: workspace.name,
      icon: workspace.icon,
      color: workspace.color,
      linkedBy,
    })),
  };
}
