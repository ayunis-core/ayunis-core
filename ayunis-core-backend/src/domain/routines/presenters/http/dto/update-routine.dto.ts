import { ApiPropertyOptional } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
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
  ROUTINE_ALLOWED_DOMAIN_INPUT_MAX_LENGTH,
} from 'src/domain/routines/domain/routines.constants';
import {
  ROUTINE_ALLOWED_DOMAINS_MAX,
  RoutineInternetAccess,
} from 'src/domain/routines/domain/routine-internet-access';

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
    enum: RoutineInternetAccess,
    enumName: 'RoutineInternetAccess',
    description:
      'Whether the routine may search and read the web: not at all, any website, or only `allowedDomains`',
  })
  @IsOptional()
  @IsEnum(RoutineInternetAccess)
  internetAccess?: RoutineInternetAccess;

  @ApiPropertyOptional({
    type: [String],
    description: `Replaces the domains (or URLs, reduced to their host) the routine may access in \`allowlist\` mode, each with its subdomains; at most ${ROUTINE_ALLOWED_DOMAINS_MAX}, no IP addresses or wildcards. Kept when the mode changes; \`allowlist\` needs at least one.`,
    example: ['nrw.de'],
  })
  // Null is rejected rather than read as "unchanged".
  @ValidateIf((_dto, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(ROUTINE_ALLOWED_DOMAINS_MAX)
  @IsString({ each: true })
  @MaxLength(ROUTINE_ALLOWED_DOMAIN_INPUT_MAX_LENGTH, { each: true })
  allowedDomains?: string[];

  @ApiPropertyOptional({
    description: 'Whether the routine runs on its schedule',
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
