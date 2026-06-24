import type { UUID } from 'crypto';
import type { AcademyLesson } from '../../domain/academy-lesson.entity';

export abstract class AcademyLessonRepository {
  abstract findOne(id: UUID): Promise<AcademyLesson | null>;
  abstract findIdsByChapterId(chapterId: UUID): Promise<UUID[]>;
  abstract findMaxPosition(chapterId: UUID): Promise<number | null>;
  abstract create(lesson: AcademyLesson): Promise<AcademyLesson>;
  abstract update(lesson: AcademyLesson): Promise<AcademyLesson>;
  abstract delete(id: UUID): Promise<void>;
  abstract updatePositions(chapterId: UUID, orderedIds: UUID[]): Promise<void>;
}
