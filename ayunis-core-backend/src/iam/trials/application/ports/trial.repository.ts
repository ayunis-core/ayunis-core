import type { Trial } from '../../domain/trial.entity';
import type { UUID } from 'crypto';

export abstract class TrialRepository {
  abstract create(trial: Trial): Promise<Trial>;
  abstract findByOrgId(orgId: UUID): Promise<Trial | null>;
  abstract incrementMessagesSent(orgId: UUID): Promise<Trial | null>;
  abstract update(trial: Trial): Promise<Trial>;
}
