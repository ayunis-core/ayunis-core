import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  ARTIFACT_DEFAULT_LIST_LIMIT,
  ARTIFACT_MAX_LIST_LIMIT,
} from 'src/domain/artifacts/domain/artifacts.constants';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';

export class FindArtifactsQueryParamsDto {
  @ApiPropertyOptional({ description: 'Search artifacts by title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ArtifactType, description: 'Filter by type' })
  @IsOptional()
  @IsEnum(ArtifactType)
  type?: ArtifactType;

  @ApiPropertyOptional({
    description:
      'Only anonymous artifacts when true, only normal artifacts when false',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ description: 'Maximum number of artifacts to return' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of artifacts to skip',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  toPagination(): { limit: number; offset: number } {
    return {
      limit: Math.min(
        this.limit ?? ARTIFACT_DEFAULT_LIST_LIMIT,
        ARTIFACT_MAX_LIST_LIMIT,
      ),
      offset: this.offset ?? 0,
    };
  }
}
