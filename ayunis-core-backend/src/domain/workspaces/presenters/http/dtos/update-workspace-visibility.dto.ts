import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WorkspaceVisibility } from 'src/domain/workspaces/domain/value-objects/workspace-visibility.enum';

export class UpdateWorkspaceVisibilityDto {
  @ApiProperty({ enum: WorkspaceVisibility })
  @IsEnum(WorkspaceVisibility)
  visibility: WorkspaceVisibility;
}
