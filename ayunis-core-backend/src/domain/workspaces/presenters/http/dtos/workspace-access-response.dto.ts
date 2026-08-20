import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';

export class WorkspaceAccessResponseDto {
  @ApiProperty({ enum: WorkspaceRole })
  role: WorkspaceRole;

  @ApiProperty()
  isOwner: boolean;
}
