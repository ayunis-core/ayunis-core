import { Injectable } from '@nestjs/common';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import type { WorkspaceListItem } from 'src/domain/workspaces/application/use-cases/find-all-workspaces/find-all-workspaces.use-case';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { WorkspaceResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-response.dto';
import { WorkspaceListResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-list-response.dto';

@Injectable()
export class WorkspaceDtoMapper {
  toDto(
    workspace: Workspace,
    access?: { accessLevel: WorkspaceAccessLevel; isOwner: boolean },
  ): WorkspaceResponseDto {
    const dto = new WorkspaceResponseDto();
    dto.id = workspace.id;
    dto.name = workspace.name;
    dto.description = workspace.description;
    dto.instruction = workspace.instruction;
    dto.icon = workspace.icon;
    dto.color = workspace.color;
    dto.createdAt = workspace.createdAt.toISOString();
    dto.updatedAt = workspace.updatedAt.toISOString();
    dto.accessLevel = access?.accessLevel;
    dto.isOwner = access?.isOwner;
    return dto;
  }

  toListItemDto(item: WorkspaceListItem): WorkspaceResponseDto {
    const dto = this.toDto(item.workspace, {
      accessLevel: item.accessLevel,
      isOwner: item.isOwner,
    });
    dto.chatCount = item.chatCount;
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
