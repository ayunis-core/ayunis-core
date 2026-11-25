import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  ROUTINE_NAME_MAX_LENGTH,
  ROUTINE_PROMPT_MAX_LENGTH,
} from 'src/domain/routines/domain/routines.constants';

export class ImproveRoutinePromptDto {
  @ApiPropertyOptional({
    description: 'The routine name, when it already has one',
  })
  @IsOptional()
  @IsString()
  @MaxLength(ROUTINE_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    enum: ['en', 'de'],
    description:
      'Current UI language, used when the draft language is unidentifiable; defaults to English',
  })
  @IsOptional()
  @IsIn(['en', 'de'])
  language?: 'en' | 'de';

  @ApiProperty({
    description: 'The task as it currently stands in the form',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(ROUTINE_PROMPT_MAX_LENGTH)
  prompt: string;
}

export class ImprovedRoutinePromptResponseDto {
  @ApiProperty({ description: 'The rewritten task' })
  text: string;
}
