import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Permission } from '../../../domain/value-objects/permission.enum';

export class RolePermissionSetDto {
  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ enum: Permission, isArray: true })
  permissions: Permission[];
}

export class RolePermissionsResponseDto {
  @ApiProperty({
    type: [RolePermissionSetDto],
    description:
      'Granted permissions per configurable role. Admins implicitly hold all permissions and are omitted.',
  })
  roles: RolePermissionSetDto[];
}
