import type { UUID } from 'crypto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ThreadType } from 'src/domain/threads/domain/thread-type.enum';

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
      'Only threads of this type, e.g. `chat` to hide routine threads. Omit for all threads.',
    enum: ThreadType,
    enumName: 'ThreadType',
  })
  @IsOptional()
  @IsEnum(ThreadType)
  type?: ThreadType;

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
