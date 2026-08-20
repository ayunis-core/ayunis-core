import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';

export class WorkspaceInvitationWorkspaceDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  color: string;
}

export class WorkspaceInvitationResponseDto {
  @ApiProperty({ type: WorkspaceInvitationWorkspaceDto })
  workspace: WorkspaceInvitationWorkspaceDto;

  @ApiProperty({ enum: WorkspaceRole })
  role: WorkspaceRole;
}
