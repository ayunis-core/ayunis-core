import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import {
  ARTIFACT_DEFAULT_LIST_LIMIT,
  ARTIFACT_MAX_LIST_LIMIT,
} from 'src/domain/artifacts/domain/artifacts.constants';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';

export class FindArtifactsByWorkspaceQueryParamsDto {
  @ApiPropertyOptional({ description: 'Search artifacts by title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ArtifactType, description: 'Filter by type' })
  @IsOptional()
  @IsEnum(ArtifactType)
  type?: ArtifactType;

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
