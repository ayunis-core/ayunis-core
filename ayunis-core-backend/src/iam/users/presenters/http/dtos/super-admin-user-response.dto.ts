import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';
import { SystemRole } from '../../../domain/value-objects/system-role.enum';

export class SuperAdminUserResponseDto extends UserResponseDto {
  @ApiProperty({
    description: 'System-level role of the user',
    enum: SystemRole,
    example: SystemRole.SUPER_ADMIN,
  })
  systemRole: SystemRole;
}
