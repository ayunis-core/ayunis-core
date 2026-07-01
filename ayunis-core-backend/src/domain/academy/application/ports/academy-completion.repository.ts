import type { UUID } from 'crypto';
import type { AcademyCompletion } from '../../domain/academy-completion.entity';

export abstract class AcademyCompletionRepository {
  abstract findByUser(userId: UUID): Promise<AcademyCompletion | null>;
  abstract upsert(completion: AcademyCompletion): Promise<AcademyCompletion>;
}
