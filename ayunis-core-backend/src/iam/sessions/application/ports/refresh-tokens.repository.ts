import type { UUID } from 'crypto';
import type { RefreshToken } from '../../domain/refresh-token.entity';

export abstract class RefreshTokensRepository {
  abstract insert(token: RefreshToken): Promise<void>;

  abstract findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;

  /**
   * In one transaction, marks the current token used, links it to the
   * successor, and inserts the successor — so a partial failure can never
   * consume the presented token without issuing its replacement. Returns false
   * (writing nothing) when the token was already used/revoked/expired, i.e. a
   * concurrent request won the rotation. Uses DB time so app-clock skew is
   * irrelevant.
   */
  abstract markUsedAndInsertSuccessor(
    currentId: UUID,
    successor: RefreshToken,
  ): Promise<boolean>;

  /**
   * True when the token was marked used within the last `graceSeconds`
   * (measured against DB time). Distinguishes a benign concurrent-request race
   * from a genuine post-rotation replay.
   */
  abstract wasUsedWithinGrace(id: UUID, graceSeconds: number): Promise<boolean>;

  /** Revokes every non-revoked token in the family (theft response / logout). */
  abstract revokeFamily(familyId: UUID): Promise<void>;

  abstract revokeAllForUser(userId: UUID): Promise<void>;

  /**
   * Revokes every non-revoked token for the user except the given family. Used
   * on self-service password change so the actor's current device survives
   * while all other sessions are killed.
   */
  abstract revokeAllForUserExceptFamily(
    userId: UUID,
    keepFamilyId: UUID,
  ): Promise<void>;

  abstract deleteExpired(now: Date): Promise<number>;
}
