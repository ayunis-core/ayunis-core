import { Injectable } from '@nestjs/common';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import type { WorkspaceSummary } from 'src/domain/workspaces/application/services/workspace-summary.service';
import type { WorkspaceDetail } from 'src/domain/workspaces/application/use-cases/find-workspace/find-workspace.use-case';
import type { WorkspaceListItem } from 'src/domain/workspaces/application/use-cases/find-all-workspaces/find-all-workspaces.use-case';
import { WorkspaceResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-response.dto';
import { WorkspaceListResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-list-response.dto';

@Injectable()
export class WorkspaceDtoMapper {
  toDto(
    workspace: Workspace,
    summary: Partial<WorkspaceSummary> = {},
  ): WorkspaceResponseDto {
    const dto = new WorkspaceResponseDto();
    dto.accessLevel = summary.accessLevel ?? 'owner';
    dto.memberCount = summary.memberCount;
    dto.id = workspace.id;
    dto.name = workspace.name;
    dto.description = workspace.description;
    dto.instruction = workspace.instruction;
    dto.icon = workspace.icon;
    dto.color = workspace.color;
    dto.createdAt = workspace.createdAt.toISOString();
    dto.updatedAt = workspace.updatedAt.toISOString();
    return dto;
  }

  toDetailDto(detail: WorkspaceDetail): WorkspaceResponseDto {
    return this.toDto(detail.workspace, detail);
  }

  toListItemDto(item: WorkspaceListItem): WorkspaceResponseDto {
    const dto = this.toDto(item.workspace, item);
    dto.chatCount = item.chatCount;
    dto.skillCount = item.skillCount;
    dto.knowledgeBaseCount = item.knowledgeBaseCount;
    dto.lastActivityAt = item.lastActivityAt.toISOString();
    return dto;
  }

  toPaginatedDto(page: Paginated<WorkspaceListItem>): WorkspaceListResponseDto {
    return {
      data: page.data.map((item) => this.toListItemDto(item)),
      pagination: {
        limit: page.limit,
        offset: page.offset,
        total: page.total,
      },
    };
  }
}
