import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import type { UUID } from 'crypto';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  ROUTINE_NAME_MAX_LENGTH,
  ROUTINE_PROMPT_MAX_LENGTH,
  ROUTINE_SOURCE_TOOL_CALL_ID_MAX_LENGTH,
  ROUTINE_ALLOWED_DOMAIN_INPUT_MAX_LENGTH,
} from 'src/domain/routines/domain/routines.constants';
import {
  ROUTINE_ALLOWED_DOMAINS_MAX,
  RoutineInternetAccess,
} from 'src/domain/routines/domain/routine-internet-access';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { RoutineScheduleDto } from './routine-schedule.dto';

const NOT_BLANK = /\S/;

export class CreateRoutineDto {
  @ApiProperty({ description: 'Name of the routine', example: 'Amtsblatt' })
  @IsString()
  @IsNotEmpty()
  @Matches(NOT_BLANK)
  @MaxLength(ROUTINE_NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({
    description: 'The task the routine runs, sent as the first message',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(NOT_BLANK)
  @MaxLength(ROUTINE_PROMPT_MAX_LENGTH)
  prompt: string;

  @ApiPropertyOptional({
    description:
      "Permitted model id; omit it and `mode` for the user's default model. Mutually exclusive with `mode`.",
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  modelId?: UUID;

  @ApiPropertyOptional({
    enum: ModelMode,
    enumName: 'ModelMode',
    description:
      'Run in a model mode, resolved for each run; mutually exclusive with `modelId`',
  })
  @IsOptional()
  @IsEnum(ModelMode)
  mode?: ModelMode;

  @ApiProperty({ type: RoutineScheduleDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => RoutineScheduleDto)
  schedule: RoutineScheduleDto;

  @ApiPropertyOptional({
    enum: RoutineInternetAccess,
    enumName: 'RoutineInternetAccess',
    description:
      'Whether the routine may search and read the web: not at all, any website, or only `allowedDomains`',
    default: RoutineInternetAccess.OFF,
  })
  @IsOptional()
  @IsEnum(RoutineInternetAccess)
  internetAccess?: RoutineInternetAccess;

  @ApiPropertyOptional({
    type: [String],
    description: `Domains (or URLs, reduced to their host) the routine may access in \`allowlist\` mode, each with its subdomains; at most ${ROUTINE_ALLOWED_DOMAINS_MAX}, no IP addresses or wildcards. \`allowlist\` needs at least one.`,
    example: ['nrw.de'],
    default: [],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ROUTINE_ALLOWED_DOMAINS_MAX)
  @IsString({ each: true })
  @MaxLength(ROUTINE_ALLOWED_DOMAIN_INPUT_MAX_LENGTH, { each: true })
  allowedDomains?: string[];

  @ApiPropertyOptional({
    description: 'Whether the routine runs on its schedule',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description:
      'The chat `create_routine` tool call this routine is created from. Each one can create only one routine per user.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(ROUTINE_SOURCE_TOOL_CALL_ID_MAX_LENGTH)
  sourceToolCallId?: string;
}
