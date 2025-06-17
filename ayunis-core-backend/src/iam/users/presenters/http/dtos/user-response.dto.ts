import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../domain/value-objects/role.object';
import { UUID } from 'crypto';

export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: UUID;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Organization ID the user belongs to',
    example: '123e4567-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  orgId: UUID;

  @ApiProperty({
    description: 'Date when the user was created',
    example: '2024-01-15T10:30:00Z',
    type: Date,
  })
  createdAt: Date;
}

export class UsersListResponseDto {
  @ApiProperty({
    description: 'List of users in the organization',
    type: [UserResponseDto],
  })
  users: UserResponseDto[];
}
