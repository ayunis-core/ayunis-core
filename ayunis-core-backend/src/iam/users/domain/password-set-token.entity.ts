import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { PasswordSetTokenPurpose } from './value-objects/password-set-token-purpose.enum';

export interface PasswordSetTokenParams {
  id?: UUID;
  userId: UUID;
  tokenHash: string;
  purpose: PasswordSetTokenPurpose;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A single-use token that authorizes setting a user's password (reset or initial
 * password). Only the SHA-256 hash of the opaque token is stored; the plaintext
 * lives solely in the emailed link. Consumption is atomic on `usedAt` so a token
 * can never be redeemed twice.
 */
export class PasswordSetToken {
  id: UUID;
  userId: UUID;
  tokenHash: string;
  purpose: PasswordSetTokenPurpose;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: PasswordSetTokenParams) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.tokenHash = params.tokenHash;
    this.purpose = params.purpose;
    this.expiresAt = params.expiresAt;
    this.usedAt = params.usedAt ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }

  isUsed(): boolean {
    return this.usedAt !== null;
  }
}
