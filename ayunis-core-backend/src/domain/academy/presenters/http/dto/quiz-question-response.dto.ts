import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';

export class QuizAnswerOptionResponseDto {
  @ApiProperty({
    type: 'string',
    description: 'The answer option text',
    example: 'A large language model',
  })
  text: string;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether this option is the correct answer',
    example: true,
  })
  isCorrect: boolean;
}

export class QuizQuestionResponseDto {
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'The unique identifier of the quiz question',
  })
  id: UUID;

  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'The id of the chapter the question belongs to',
  })
  chapterId: UUID;

  @ApiProperty({
    type: 'string',
    description: 'The question prompt',
    example: 'What is an LLM?',
  })
  text: string;

  @ApiProperty({
    type: [QuizAnswerOptionResponseDto],
    description: 'The answer options with the correct one flagged',
  })
  options: QuizAnswerOptionResponseDto[];

  @ApiProperty({
    type: 'integer',
    description: 'The position of the question within its chapter (0-based)',
    example: 0,
  })
  position: number;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'The date the question was created',
  })
  createdAt: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'The date the question was last updated',
  })
  updatedAt: Date;
}
