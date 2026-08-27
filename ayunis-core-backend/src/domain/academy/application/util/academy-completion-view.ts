import type { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';
import type { AcademyCompletionView } from 'src/domain/academy/domain/academy-completion-view';
import { certificateExpiresAt } from './certificate-validity';

/**
 * The one place a completion row becomes the published view.
 *
 * Deriving `expiresAt` here rather than in a Postgres generated column keeps the
 * validity period in a single language: the column form has to repeat the
 * period in SQL while confirmation validity still needs it in TypeScript, and
 * TypeORM records generated columns in `typeorm_metadata` keyed by database
 * name, which reports phantom drift in any environment whose database is not
 * named the same as the one the migration was generated against.
 */
export function toAcademyCompletionView(
  completion: AcademyCompletion,
): AcademyCompletionView {
  return {
    completedAt: completion.completedAt,
    expiresAt: certificateExpiresAt(completion.completedAt),
  };
}
