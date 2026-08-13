import { Injectable } from '@nestjs/common';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspaceResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-response.dto';

@Injectable()
export class WorkspaceDtoMapper {
  toDto(workspace: Workspace): WorkspaceResponseDto {
    const dto = new WorkspaceResponseDto();
    dto.id = workspace.id;
    dto.name = workspace.name;
    dto.description = workspace.description;
    dto.icon = workspace.icon;
    dto.color = workspace.color;
    dto.createdAt = workspace.createdAt.toISOString();
    dto.updatedAt = workspace.updatedAt.toISOString();
    return dto;
  }
}
