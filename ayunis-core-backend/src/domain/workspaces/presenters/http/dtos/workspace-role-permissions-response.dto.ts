import { ApiProperty } from '@nestjs/swagger';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class WorkspaceRolePermissionSetDto {
  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({
    enum: Permission,
    isArray: true,
    description:
      'Workspace-scoped permissions this role grants within the workspace',
  })
  permissions: Permission[];
}

export class WorkspaceRolePermissionsResponseDto {
  @ApiProperty({ type: [WorkspaceRolePermissionSetDto] })
  roles: WorkspaceRolePermissionSetDto[];
}
