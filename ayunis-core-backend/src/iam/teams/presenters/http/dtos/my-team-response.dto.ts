import { ApiProperty } from '@nestjs/swagger';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { TeamResponseDto } from './team-response.dto';

export class MyTeamResponseDto extends TeamResponseDto {
  @ApiProperty({
    description: "The current user's role within the team",
    enum: UserRole,
    example: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({
    description:
      "The current user's effective permissions in this team: those of their organisation role plus those of their team role",
    enum: Permission,
    isArray: true,
  })
  permissions: Permission[];
}
