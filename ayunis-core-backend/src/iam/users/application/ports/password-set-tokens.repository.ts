import type { UUID } from 'crypto';
import type { PasswordSetToken } from '../../domain/password-set-token.entity';
import type { PasswordSetTokenPurpose } from '../../domain/value-objects/password-set-token-purpose.enum';

export abstract class PasswordSetTokensRepository {
  /**
   * Replaces any outstanding token for the (user, purpose) with the given one
   * (transactional). Triggering a new link invalidates the previous one.
   */
  abstract replaceForUser(
    userId: UUID,
    purpose: PasswordSetTokenPurpose,
    token: PasswordSetToken,
  ): Promise<void>;

  abstract findByTokenHash(tokenHash: string): Promise<PasswordSetToken | null>;

  /**
   * Atomically marks a token as used. Returns false when the token was already
   * consumed by a concurrent request.
   */
  abstract consume(id: UUID, usedAt: Date): Promise<boolean>;

  /** Deletes every token that is expired or already used. Returns the count. */
  abstract deleteExpiredOrUsed(now: Date): Promise<number>;
}
