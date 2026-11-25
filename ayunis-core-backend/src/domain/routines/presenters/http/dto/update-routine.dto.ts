import { ApiPropertyOptional } from '@nestjs/swagger';
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  ROUTINE_NAME_MAX_LENGTH,
  ROUTINE_PROMPT_MAX_LENGTH,
  ROUTINE_ALLOWED_DOMAIN_INPUT_MAX_LENGTH,
} from 'src/domain/routines/domain/routines.constants';
import {
  ROUTINE_ALLOWED_DOMAINS_MAX,
  RoutineInternetAccess,
} from 'src/domain/routines/domain/routine-internet-access';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { RoutineScheduleDto } from './routine-schedule.dto';

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
    description:
      "Permitted model id. Sending `modelId` or `mode` replaces the routine's model choice; with both null (or one null and the other omitted) it uses the user's default model.",
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  modelId?: UUID | null;

  @ApiPropertyOptional({
    enum: ModelMode,
    enumName: 'ModelMode',
    nullable: true,
    description:
      'Run in a model mode, resolved for each run; mutually exclusive with a non-null `modelId`',
  })
  @IsOptional()
  @IsEnum(ModelMode)
  mode?: ModelMode | null;

  @ApiPropertyOptional({
    type: RoutineScheduleDto,
    description: 'Replaces the whole schedule; omit it to keep the schedule',
  })
  // Null is rejected rather than read as "unchanged".
  @ValidateIf((_dto, value) => value !== undefined)
  @IsDefined()
  @ValidateNested()
  @Type(() => RoutineScheduleDto)
  schedule?: RoutineScheduleDto;

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
