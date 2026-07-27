import { ApiProperty } from '@nestjs/swagger';
import { Permission } from '../../../domain/value-objects/permission.enum';

export class MyPermissionsResponseDto {
  @ApiProperty({
    enum: Permission,
    isArray: true,
    description:
      "The current user's effective permissions (admins hold all of them)",
  })
  permissions: Permission[];
}
