import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';

export class AddWorkspaceTeamGrantDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  teamId: string;

  @ApiProperty({ enum: WorkspaceRole })
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}
