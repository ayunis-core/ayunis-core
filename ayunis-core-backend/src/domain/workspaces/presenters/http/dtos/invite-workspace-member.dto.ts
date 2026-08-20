import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';

export class InviteWorkspaceMemberDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: WorkspaceAccessLevel })
  @IsEnum(WorkspaceAccessLevel)
  accessLevel: WorkspaceAccessLevel;
}
