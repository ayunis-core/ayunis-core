import { ApiProperty } from '@nestjs/swagger';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class TeamRolePermissionSetDto {
  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({
    enum: Permission,
    isArray: true,
    description: 'Team-scoped permissions this role grants within the team',
  })
  permissions: Permission[];
}

export class TeamRolePermissionsResponseDto {
  @ApiProperty({ type: [TeamRolePermissionSetDto] })
  roles: TeamRolePermissionSetDto[];
}
