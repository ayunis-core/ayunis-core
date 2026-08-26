import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, ValidateIf } from 'class-validator';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';

export class SetWorkspaceTeamMemberOverrideDto {
  @ApiProperty({ enum: WorkspaceAccessLevel, nullable: true })
  @IsDefined()
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsEnum(WorkspaceAccessLevel)
  accessLevel: WorkspaceAccessLevel | null;
}
