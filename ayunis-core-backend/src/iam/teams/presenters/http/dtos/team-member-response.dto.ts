import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

export class TeamMemberResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the team member',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: UUID;

  @ApiProperty({
    description: 'The user ID of the team member',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: UUID;

  @ApiProperty({
    description: 'The name of the team member',
    example: 'John Doe',
  })
  userName: string;

  @ApiProperty({
    description: 'The email of the team member',
    example: 'john.doe@example.com',
  })
  userEmail: string;

  @ApiProperty({
    description: 'The role of the team member in the organization',
    enum: UserRole,
    example: UserRole.USER,
  })
  userRole: UserRole;

  @ApiProperty({
    description: 'The date when the user joined the team',
    example: '2024-01-15T10:30:00.000Z',
  })
  joinedAt: Date;
}

export class PaginatedTeamMembersResponseDto {
  @ApiProperty({
    description: 'Array of team members for the current page',
    type: [TeamMemberResponseDto],
  })
  data: TeamMemberResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
