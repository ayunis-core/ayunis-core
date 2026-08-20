import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';

export class WorkspaceAccessLevelDto {
  @ApiProperty({ enum: WorkspaceAccessLevel })
  @IsEnum(WorkspaceAccessLevel)
  accessLevel: WorkspaceAccessLevel;
}
