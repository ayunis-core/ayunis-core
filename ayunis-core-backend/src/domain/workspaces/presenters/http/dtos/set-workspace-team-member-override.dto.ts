import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, ValidateIf } from 'class-validator';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';

export class SetWorkspaceTeamMemberOverrideDto {
  @ApiProperty({ enum: WorkspaceRole, nullable: true })
  @IsDefined()
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole | null;
}
