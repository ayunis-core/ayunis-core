import { ApiProperty } from '@nestjs/swagger';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';

export class MyPermissionsResponseDto {
  @ApiProperty({
    enum: Permission,
    isArray: true,
    description:
      "The current user's effective permissions (admins hold all of them)",
  })
  permissions: Permission[];

  @ApiProperty({
    enum: TeamAdminPermission,
    isArray: true,
    description:
      "The org's team admin rights. They apply only inside the teams a team admin administers (see GET /teams/me).",
  })
  teamAdminPermissions: TeamAdminPermission[];
}
