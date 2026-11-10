import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class WorkspaceMemberResponseDto {
  @ApiProperty({
    description: 'The user ID of the member',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiProperty({ description: 'The name of the member', example: 'Anna Huber' })
  name: string;

  @ApiProperty({
    description: 'The email of the member',
    example: 'anna.huber@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'The role of the member within the workspace',
    enum: UserRole,
    example: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({
    description: 'When the user was added to the workspace',
    example: '2026-11-10T10:30:00.000Z',
  })
  joinedAt: string;
}
