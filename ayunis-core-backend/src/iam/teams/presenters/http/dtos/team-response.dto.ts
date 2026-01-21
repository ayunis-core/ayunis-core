import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';

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
}
