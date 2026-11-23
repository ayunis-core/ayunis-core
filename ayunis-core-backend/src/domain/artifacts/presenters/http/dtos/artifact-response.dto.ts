import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

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

export class ArtifactPiiMaskResponseDto {
  @ApiProperty({
    description:
      'The placeholder as it appears in the artifact content, e.g. {{pii:PERSON_NAME_1}}',
    example: '{{pii:PERSON_NAME_1}}',
  })
  token: string;

  @ApiProperty({
    description: 'The real value the placeholder stands for',
    example: 'Max Mustermann',
  })
  value: string;

  @ApiProperty({
    description: 'PII category of the value',
    enum: PiiCategory,
    enumName: 'PiiCategory',
    example: PiiCategory.PERSON_NAME,
  })
  category: PiiCategory;
}

export class ArtifactResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the artifact',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'The kind of artifact — document (HTML) or diagram (mermaid)',
    enum: ArtifactType,
    example: ArtifactType.DOCUMENT,
  })
  type: ArtifactType;

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

  @ApiPropertyOptional({
    description: 'The letterhead applied to this artifact',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  letterheadId: string | null;

  @ApiProperty({
    description:
      'Whether the artifact was created in an anonymous run; its content then holds {{pii:…}} placeholders resolved by piiMasks',
    example: false,
  })
  isAnonymous: boolean;

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

  @ApiPropertyOptional({
    description:
      "The anonymous artifact's own placeholder dictionary (included with the versions)",
    type: [ArtifactPiiMaskResponseDto],
  })
  piiMasks?: ArtifactPiiMaskResponseDto[];

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
