import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export interface UserTotpParams {
  id?: UUID;
  userId: UUID;
  encryptedSecret: string;
  confirmedAt?: Date | null;
  failedAttempts?: number;
  lockedUntil?: Date | null;
  lastUsedCounter?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A user's TOTP enrollment. `confirmedAt === null` means enrollment was
 * started (secret issued) but never confirmed with a valid code — such rows
 * are overwritten by the next setup attempt and do not gate login.
 */
export class UserTotp {
  id: UUID;
  userId: UUID;
  encryptedSecret: string;
  confirmedAt: Date | null;
  failedAttempts: number;
  lockedUntil: Date | null;
  /**
   * TOTP time step (floor(epoch / period)) of the last accepted code.
   * Codes with a step <= this value are replays and must be rejected.
   */
  lastUsedCounter: number | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: UserTotpParams) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.encryptedSecret = params.encryptedSecret;
    this.confirmedAt = params.confirmedAt ?? null;
    this.failedAttempts = params.failedAttempts ?? 0;
    this.lockedUntil = params.lockedUntil ?? null;
    this.lastUsedCounter = params.lastUsedCounter ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  isConfirmed(): boolean {
    return this.confirmedAt !== null;
  }

  isLocked(now: Date): boolean {
    return this.lockedUntil !== null && this.lockedUntil > now;
  }
}
