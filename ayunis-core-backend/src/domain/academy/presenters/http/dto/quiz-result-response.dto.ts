import { ApiProperty } from '@nestjs/swagger';

export class QuizResultResponseDto {
  @ApiProperty({
    type: 'boolean',
    description: 'Whether the attempt met the chapter pass threshold',
  })
  passed: boolean;

  @ApiProperty({
    type: 'integer',
    description: 'Number of questions answered correctly',
    example: 8,
  })
  correctCount: number;

  @ApiProperty({
    type: 'integer',
    description: 'Number of questions in the attempt',
    example: 10,
  })
  totalCount: number;

  @ApiProperty({
    type: 'integer',
    description: 'Number of correct answers required to pass',
    example: 8,
  })
  requiredCount: number;

  @ApiProperty({
    type: 'integer',
    description: 'Score as a percentage of correct answers',
    example: 80,
  })
  score: number;

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether passing this chapter completed the whole academy for the user',
  })
  academyCompleted: boolean;
}
