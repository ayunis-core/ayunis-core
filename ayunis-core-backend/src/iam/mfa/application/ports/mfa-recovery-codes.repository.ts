import type { UUID } from 'crypto';
import type { MfaRecoveryCode } from '../../domain/mfa-recovery-code.entity';

export abstract class MfaRecoveryCodesRepository {
  /** Replaces all of the user's codes with the given set (transactional). */
  abstract replaceForUser(
    userId: UUID,
    codes: MfaRecoveryCode[],
  ): Promise<void>;

  abstract findUnusedByUserId(userId: UUID): Promise<MfaRecoveryCode[]>;

  abstract countUnusedByUserId(userId: UUID): Promise<number>;

  /**
   * Atomically marks a code as used. Returns false when the code was already
   * consumed by a concurrent request.
   */
  abstract consume(id: UUID, usedAt: Date): Promise<boolean>;

  abstract deleteByUserId(userId: UUID): Promise<void>;
}
