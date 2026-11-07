import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
    description: "Permitted model id; omit for the user's default model",
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  modelId?: UUID;

  @ApiProperty({
    description: 'Daily run time as HH:mm (Europe/Berlin)',
    example: '07:30',
  })
  @IsString()
  @Matches(ROUTINE_DAILY_TIME_PATTERN)
  dailyTime: string;

  @ApiProperty({
    description: 'Whether the routine may search and read the web',
  })
  @IsBoolean()
  internetEnabled: boolean;

  @ApiPropertyOptional({
    description: 'Whether the routine runs on its schedule',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
