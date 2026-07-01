import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';

/**
 * A quiz answer option as shown to a learner taking the quiz. It deliberately
 * omits `isCorrect` — correct answers are never sent to the client.
 */
export class QuizAnswerOptionForTakingResponseDto {
  @ApiProperty({
    type: 'string',
    description: 'The answer option text',
    example: 'A large language model',
  })
  text: string;
}

export class QuizQuestionForTakingResponseDto {
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'The unique identifier of the question',
  })
  id: UUID;

  @ApiProperty({
    type: 'string',
    description: 'The question prompt',
    example: 'What is an LLM?',
  })
  text: string;

  @ApiProperty({
    type: [QuizAnswerOptionForTakingResponseDto],
    description: 'The answer options, without indicating the correct one',
  })
  options: QuizAnswerOptionForTakingResponseDto[];
}
