import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class QuizAnswerOptionRequestDto {
  @ApiProperty({
    description: 'The answer option text',
    example: 'A large language model',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text: string;

  @ApiProperty({
    description: 'Whether this option is the correct answer',
    example: true,
  })
  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuizQuestionRequestDto {
  @ApiProperty({
    description: 'The question prompt',
    example: 'What is an LLM?',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;

  @ApiProperty({
    description:
      'The answer options. Between 2 and 6 options with exactly one marked correct.',
    type: [QuizAnswerOptionRequestDto],
    minItems: 2,
    maxItems: 6,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerOptionRequestDto)
  options: QuizAnswerOptionRequestDto[];
}
