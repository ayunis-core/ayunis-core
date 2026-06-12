import type { UUID } from 'crypto';
import type { AcademyChapter } from '../../domain/academy-chapter.entity';

export abstract class AcademyChapterRepository {
  abstract findAllWithLessons(): Promise<AcademyChapter[]>;
  abstract findOne(id: UUID): Promise<AcademyChapter | null>;
  abstract findAllIds(): Promise<UUID[]>;
  abstract findMaxPosition(): Promise<number | null>;
  abstract create(chapter: AcademyChapter): Promise<AcademyChapter>;
  abstract update(chapter: AcademyChapter): Promise<AcademyChapter>;
  abstract delete(id: UUID): Promise<void>;
  abstract updatePositions(orderedIds: UUID[]): Promise<void>;
}
