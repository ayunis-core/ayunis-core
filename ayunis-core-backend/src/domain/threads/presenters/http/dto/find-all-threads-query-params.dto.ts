import type { UUID } from 'crypto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class FindAllThreadsQueryParamsDto {
  @ApiPropertyOptional({ description: 'Search threads by title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Only threads filed under this workspace. Omit for all threads.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  workspaceId?: UUID;

  @ApiPropertyOptional({
    description:
      'Only threads that are not filed under any workspace. Omit for all threads.',
    type: 'boolean',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unfiled?: boolean;

  @ApiPropertyOptional({ description: 'Maximum number of threads to return' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of threads to skip', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}
