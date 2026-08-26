import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';

export class AddWorkspaceTeamGrantDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  teamId: string;

  @ApiProperty({ enum: WorkspaceAccessLevel })
  @IsEnum(WorkspaceAccessLevel)
  accessLevel: WorkspaceAccessLevel;
}
