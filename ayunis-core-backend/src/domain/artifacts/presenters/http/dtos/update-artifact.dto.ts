import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import type { UUID } from 'crypto';
import { ARTIFACT_MAX_CONTENT_LENGTH } from 'src/domain/artifacts/application/artifacts.errors';

export class UpdateArtifactDto {
  @ApiPropertyOptional({
    description:
      'Updated HTML content of the document. When omitted, no new version is created.',
    example: '<p>Updated meeting notes...</p>',
  })
  @ValidateIf((o: UpdateArtifactDto) => o.content !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(ARTIFACT_MAX_CONTENT_LENGTH)
  content?: string;

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
