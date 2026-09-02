import type { UUID } from 'crypto';
import type { AcademyChapterConfirmation } from 'src/domain/academy/domain/academy-chapter-confirmation.entity';

export abstract class AcademyChapterConfirmationRepository {
  abstract findAllByUser(userId: UUID): Promise<AcademyChapterConfirmation[]>;
  abstract upsert(
    confirmation: AcademyChapterConfirmation,
  ): Promise<AcademyChapterConfirmation>;
}
