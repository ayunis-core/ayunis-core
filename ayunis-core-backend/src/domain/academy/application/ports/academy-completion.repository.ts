import type { UUID } from 'crypto';
import type { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';

export abstract class AcademyCompletionRepository {
  abstract findByUser(userId: UUID): Promise<AcademyCompletion | null>;
  abstract upsert(completion: AcademyCompletion): Promise<AcademyCompletion>;
}
