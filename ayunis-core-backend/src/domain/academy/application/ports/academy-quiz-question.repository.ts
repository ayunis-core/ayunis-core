import type { UUID } from 'crypto';
import type { AcademyQuizQuestion } from '../../domain/academy-quiz-question.entity';

export abstract class AcademyQuizQuestionRepository {
  abstract findOne(id: UUID): Promise<AcademyQuizQuestion | null>;
  abstract findAllByChapter(chapterId: UUID): Promise<AcademyQuizQuestion[]>;
  abstract findMaxPosition(chapterId: UUID): Promise<number | null>;
  abstract create(
    quizQuestion: AcademyQuizQuestion,
  ): Promise<AcademyQuizQuestion>;
  abstract update(
    quizQuestion: AcademyQuizQuestion,
  ): Promise<AcademyQuizQuestion>;
  abstract delete(id: UUID): Promise<void>;
}
