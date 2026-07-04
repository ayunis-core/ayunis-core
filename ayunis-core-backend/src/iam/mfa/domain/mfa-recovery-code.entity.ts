import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export interface MfaRecoveryCodeParams {
  id?: UUID;
  userId: UUID;
  codeHash: string;
  usedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A single-use MFA recovery code (stored as a bcrypt hash). Consumption is
 * atomic on `usedAt` so a code can never be redeemed twice.
 */
export class MfaRecoveryCode {
  id: UUID;
  userId: UUID;
  codeHash: string;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: MfaRecoveryCodeParams) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.codeHash = params.codeHash;
    this.usedAt = params.usedAt ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
