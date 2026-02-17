import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';

export class SkillResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the skill',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  id: UUID;

  @ApiProperty({
    description: 'The name of the skill',
    example: 'Legal Research',
  })
  name: string;

  @ApiProperty({
    description: 'A short description of the skill',
    example:
      'Research legal topics, find relevant case law, and draft legal documents.',
  })
  shortDescription: string;

  @ApiProperty({
    description: 'Detailed instructions for the skill',
    example:
      'You are a legal research assistant. When activated, search through the attached legal databases...',
  })
  instructions: string;

  @ApiProperty({
    description:
      'The marketplace identifier if this skill was installed from the marketplace',
    example: 'meeting-summarizer',
    type: 'string',
    nullable: true,
  })
  marketplaceIdentifier: string | null;

  @ApiProperty({
    description: 'Whether the skill is active and available for use in chats',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'The unique identifier of the user who owns this skill',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  userId: UUID;

  @ApiProperty({
    description: 'The date and time when the skill was created',
    example: '2023-12-01T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date and time when the skill was last updated',
    example: '2023-12-01T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;

  @ApiProperty({
    description:
      'Whether the skill is shared with the current user (not owned)',
    example: false,
  })
  isShared: boolean;
}

export class SkillSourceResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the source',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  id: UUID;

  @ApiProperty({
    description: 'The name of the source',
    example: 'Legal Database 2024',
  })
  name: string;

  @ApiProperty({
    description: 'The type of source',
    example: 'file',
  })
  type: string;
}
