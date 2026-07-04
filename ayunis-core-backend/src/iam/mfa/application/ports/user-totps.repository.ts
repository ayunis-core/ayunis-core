import type { UUID } from 'crypto';
import type { UserTotp } from '../../domain/user-totp.entity';

export abstract class UserTotpsRepository {
  abstract findByUserId(userId: UUID): Promise<UserTotp | null>;

  abstract upsert(totp: UserTotp): Promise<UserTotp>;

  abstract deleteByUserId(userId: UUID): Promise<void>;

  /**
   * Atomically increments the failed-attempt counter and returns the new
   * count. Sets `lockedUntil` in the same statement once the count reaches
   * `lockThreshold`, so concurrent failures cannot slip past the lock.
   */
  abstract registerFailedAttempt(
    userId: UUID,
    lockThreshold: number,
    lockedUntil: Date,
  ): Promise<number>;

  /**
   * Atomically records a successful TOTP verification: sets
   * `lastUsedCounter`, clears failures and lock — but only when `counter` is
   * strictly greater than the stored `lastUsedCounter` (replay protection).
   * Returns false when the code's time step was already consumed.
   */
  abstract markVerified(userId: UUID, counter: number): Promise<boolean>;

  /** Clears failures and lock without touching the replay counter. */
  abstract resetFailures(userId: UUID): Promise<void>;
}
