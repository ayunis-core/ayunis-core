import { ApiProperty } from '@nestjs/swagger';
import { AcademyChapterResponseDto } from './academy-chapter-response.dto';
import { QuizQuestionResponseDto } from './quiz-question-response.dto';

/**
 * Super-admin variant of the chapter response that additionally exposes the
 * quiz question pool (including correct answers). This DTO must NEVER be
 * returned from a learner-facing endpoint.
 */
export class SuperAdminAcademyChapterResponseDto extends AcademyChapterResponseDto {
  @ApiProperty({
    type: [QuizQuestionResponseDto],
    description: 'The quiz question pool of the chapter, ordered by position',
  })
  quizQuestions: QuizQuestionResponseDto[];
}
