import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';

export class TeamAdminSummaryDto {
  @ApiProperty({
    description: 'The user ID of the team admin',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  userId: UUID;

  @ApiProperty({
    description: 'The name of the team admin',
    example: 'Jonas Weber',
  })
  name: string;
}

export class TeamResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the team',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: UUID;

  @ApiProperty({
    description: 'The name of the team',
    example: 'Engineering',
  })
  name: string;

  @ApiProperty({
    description: 'The organization ID the team belongs to',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  orgId: UUID;

  @ApiProperty({
    description: 'The date and time when the team was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date and time when the team was last updated',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Whether model access override is enabled for this team',
    example: false,
  })
  modelOverrideEnabled: boolean;

  @ApiProperty({
    description:
      'The number of members in the team. Only populated by the admin list endpoint (GET /teams).',
    example: 5,
    required: false,
  })
  memberCount?: number;

  @ApiProperty({
    description:
      'The team admins, sorted by name. Only populated by GET /teams and GET /teams/:id.',
    type: [TeamAdminSummaryDto],
    required: false,
  })
  teamAdmins?: TeamAdminSummaryDto[];

  @ApiProperty({
    description:
      'Whether the current user is a team admin of this team. Only populated by GET /teams/me.',
    example: false,
    required: false,
  })
  isTeamAdmin?: boolean;
}
