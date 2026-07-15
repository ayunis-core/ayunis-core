import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export interface RefreshTokenParams {
  id?: UUID;
  userId: UUID;
  familyId: UUID;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  revokedAt?: Date | null;
  replacedByTokenId?: UUID | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A single server-side refresh token. Rotation marks the presented token used
 * and issues a successor in the same `familyId`; reuse of a revoked or
 * past-grace token revokes the whole family (theft response). Only the SHA-256
 * hash of the opaque token value is stored.
 */
export class RefreshToken {
  id: UUID;
  userId: UUID;
  familyId: UUID;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  replacedByTokenId: UUID | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: RefreshTokenParams) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.familyId = params.familyId;
    this.tokenHash = params.tokenHash;
    this.expiresAt = params.expiresAt;
    this.usedAt = params.usedAt ?? null;
    this.revokedAt = params.revokedAt ?? null;
    this.replacedByTokenId = params.replacedByTokenId ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }

  isRevoked(): boolean {
    return this.revokedAt !== null;
  }
}
