import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';

export class WorkspaceAccessResponseDto {
  @ApiProperty({ enum: WorkspaceAccessLevel })
  accessLevel: WorkspaceAccessLevel;

  @ApiProperty()
  isOwner: boolean;
}
