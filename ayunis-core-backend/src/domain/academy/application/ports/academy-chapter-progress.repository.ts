import type { UUID } from 'crypto';
import type { AcademyChapterProgress } from '../../domain/academy-chapter-progress.entity';

export abstract class AcademyChapterProgressRepository {
  abstract findByUserAndChapter(
    userId: UUID,
    chapterId: UUID,
  ): Promise<AcademyChapterProgress | null>;
  abstract findAllByUser(userId: UUID): Promise<AcademyChapterProgress[]>;
  abstract upsert(
    progress: AcademyChapterProgress,
  ): Promise<AcademyChapterProgress>;
}
