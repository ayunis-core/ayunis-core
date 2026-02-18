import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';

export class ArtifactVersionResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the version',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'The artifact this version belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  artifactId: string;

  @ApiProperty({
    description: 'Sequential version number',
    example: 1,
  })
  versionNumber: number;

  @ApiProperty({
    description: 'HTML content of this version',
    example: '<p>Document content...</p>',
  })
  content: string;

  @ApiProperty({
    description: 'Who authored this version',
    enum: AuthorType,
    example: AuthorType.ASSISTANT,
  })
  authorType: AuthorType;

  @ApiPropertyOptional({
    description: 'ID of the author (user ID if authored by user, null if AI)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  authorId: string | null;

  @ApiProperty({
    description: 'When this version was created',
    example: '2026-01-15T10:30:00.000Z',
  })
  createdAt: string;
}

export class ArtifactResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the artifact',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'The thread this artifact belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  threadId: string;

  @ApiProperty({
    description: 'The user who owns this artifact',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Title of the document',
    example: 'Meeting Notes Q1 2026',
  })
  title: string;

  @ApiProperty({
    description: 'Current version number',
    example: 3,
  })
  currentVersionNumber: number;

  @ApiPropertyOptional({
    description: 'All versions of this artifact (included when fetching by ID)',
    type: [ArtifactVersionResponseDto],
  })
  versions?: ArtifactVersionResponseDto[];

  @ApiProperty({
    description: 'When the artifact was created',
    example: '2026-01-15T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the artifact was last updated',
    example: '2026-01-15T10:30:00.000Z',
  })
  updatedAt: string;
}
