import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { UUID } from 'crypto';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ARTIFACT_MAX_CONTENT_LENGTH } from '../../../application/artifacts.errors';

export class CreateArtifactDto {
  @ApiProperty({
    description: 'Title of the document',
    example: 'Meeting Notes Q1 2026',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiProperty({
    description: 'HTML content of the document',
    example: '<p>Meeting notes content...</p>',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ARTIFACT_MAX_CONTENT_LENGTH)
  content: string;

  @ApiProperty({
    description: 'The thread this artifact belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  threadId: UUID;

  @ApiProperty({
    description: 'Who authored this version',
    enum: AuthorType,
    example: AuthorType.ASSISTANT,
  })
  @IsEnum(AuthorType)
  authorType: AuthorType;
}
