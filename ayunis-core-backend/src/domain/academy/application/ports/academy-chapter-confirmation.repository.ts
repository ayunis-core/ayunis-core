import type { UUID } from 'crypto';
import type { AcademyChapterConfirmation } from 'src/domain/academy/domain/academy-chapter-confirmation.entity';

export abstract class AcademyChapterConfirmationRepository {
  /**
   * Serialises this learner's confirmations until the surrounding
   * transaction ends, so concurrent requests see each other's writes.
   */
  abstract lockForUser(userId: UUID): Promise<void>;

  abstract findAllByUser(userId: UUID): Promise<AcademyChapterConfirmation[]>;
  abstract upsert(
    confirmation: AcademyChapterConfirmation,
  ): Promise<AcademyChapterConfirmation>;
}
