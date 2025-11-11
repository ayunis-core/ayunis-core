import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../../users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

export class SuccessResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;
}

export class MeResponseDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({
    description: 'User system role',
    enum: SystemRole,
    example: SystemRole.SUPER_ADMIN,
  })
  systemRole: SystemRole;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name: string;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Authentication failed',
  })
  message: string;
}
