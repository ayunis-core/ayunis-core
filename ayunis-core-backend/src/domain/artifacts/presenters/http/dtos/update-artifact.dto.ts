import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import type { UUID } from 'crypto';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ARTIFACT_MAX_CONTENT_LENGTH } from '../../../application/artifacts.errors';

export class UpdateArtifactDto {
  @ApiProperty({
    description: 'Updated HTML content of the document',
    example: '<p>Updated meeting notes...</p>',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ARTIFACT_MAX_CONTENT_LENGTH)
  content: string;

  @ApiProperty({
    description: 'Who authored this version',
    enum: AuthorType,
    example: AuthorType.USER,
  })
  @IsEnum(AuthorType)
  authorType: AuthorType;

  @ApiPropertyOptional({
    description:
      'Optional letterhead to apply to this artifact (null to remove)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
    nullable: true,
  })
  @ValidateIf((o: UpdateArtifactDto) => o.letterheadId !== null)
  @IsUUID()
  @IsOptional()
  letterheadId?: UUID | null;
}
