import { ApiPropertyOptional } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  ROUTINE_DAILY_TIME_PATTERN,
  ROUTINE_NAME_MAX_LENGTH,
  ROUTINE_PROMPT_MAX_LENGTH,
} from 'src/domain/routines/domain/routines.constants';

const NOT_BLANK = /\S/;

/** Omitted properties stay unchanged. */
export class UpdateRoutineDto {
  @ApiPropertyOptional({ description: 'Name of the routine' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(NOT_BLANK)
  @MaxLength(ROUTINE_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({ description: 'The task the routine runs' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(NOT_BLANK)
  @MaxLength(ROUTINE_PROMPT_MAX_LENGTH)
  prompt?: string;

  @ApiPropertyOptional({ description: 'Permitted model id', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  modelId?: UUID;

  @ApiPropertyOptional({
    description: 'Daily run time as HH:mm (Europe/Berlin)',
    example: '07:30',
  })
  @IsOptional()
  @IsString()
  @Matches(ROUTINE_DAILY_TIME_PATTERN)
  dailyTime?: string;

  @ApiPropertyOptional({
    description: 'Whether the routine may search and read the web',
  })
  @IsOptional()
  @IsBoolean()
  internetEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the routine runs on its schedule',
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
