import { ApiPropertyOptional } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
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

  @ApiPropertyOptional({
    type: String,
    description: "Permitted model id; null for the user's default model",
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  modelId?: UUID | null;

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
    description:
      'Integrations whose tools the routine may use, replacing the current ones; each must be enabled and connected for the user',
    type: [String],
    format: 'uuid',
  })
  // Null is rejected rather than read as "unchanged".
  @ValidateIf((_dto, value) => value !== undefined)
  @IsArray()
  @IsUUID('all', { each: true })
  mcpIntegrationIds?: UUID[];

  @ApiPropertyOptional({
    description: 'Whether the routine runs on its schedule',
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
