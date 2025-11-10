import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../../users/domain/value-objects/role.object';

export class SuccessResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;
}

export class MeResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

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
