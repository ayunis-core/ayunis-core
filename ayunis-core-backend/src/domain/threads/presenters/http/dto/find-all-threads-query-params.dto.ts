import type { UUID } from 'crypto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ThreadType } from 'src/domain/threads/domain/thread-type.enum';
import {
  SESSION_CLIENTS,
  type SessionClient,
} from 'src/iam/sessions/domain/value-objects/session-client';

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

  @ApiPropertyOptional({
    description:
      "Only the routine threads of this routine's runs. Another user's routine yields none.",
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  routineId?: UUID;

  @ApiPropertyOptional({
    description:
      'Only threads started from this client, e.g. `outlook` for the Outlook pane. Omit to list only threads started in the web app.',
    enum: SESSION_CLIENTS,
    enumName: 'SessionClient',
  })
  @IsOptional()
  @IsIn(SESSION_CLIENTS)
  client?: SessionClient;

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
