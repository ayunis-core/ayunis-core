import type { UUID } from 'crypto';
import { RefreshToken } from 'src/iam/sessions/domain/refresh-token.entity';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import type { RefreshTokensRepository } from 'src/iam/sessions/application/ports/refresh-tokens.repository';

export const TEST_USER_ID = '22222222-2222-2222-2222-222222222222' as UUID;
export const TEST_FAMILY_ID = '33333333-3333-3333-3333-333333333333' as UUID;
export const TEST_TOKEN_ID = '44444444-4444-4444-4444-444444444444' as UUID;

function nullable<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

export function aRefreshToken(
  overrides: Partial<{
    id: UUID;
    userId: UUID;
    familyId: UUID;
    tokenHash: string;
    authenticationMethod: SessionAuthenticationMethod;
    zitadelSessionId: string | null;
    familyExpiresAt: Date | null;
    expiresAt: Date;
    usedAt: Date | null;
    revokedAt: Date | null;
  }> = {},
): RefreshToken {
  return new RefreshToken({
    id: overrides.id ?? TEST_TOKEN_ID,
    userId: overrides.userId ?? TEST_USER_ID,
    familyId: overrides.familyId ?? TEST_FAMILY_ID,
    tokenHash: overrides.tokenHash ?? 'sha256-hash',
    authenticationMethod:
      overrides.authenticationMethod ?? SessionAuthenticationMethod.PASSWORD,
    zitadelSessionId: nullable(overrides.zitadelSessionId),
    familyExpiresAt: nullable(overrides.familyExpiresAt),
    expiresAt:
      overrides.expiresAt ?? new Date(Date.now() + 7 * 24 * 3600 * 1000),
    usedAt: overrides.usedAt ?? null,
    revokedAt: overrides.revokedAt ?? null,
  });
}

export function createMockRefreshTokensRepository(): jest.Mocked<RefreshTokensRepository> {
  return {
    insert: jest.fn().mockResolvedValue(undefined),
    findByTokenHash: jest.fn().mockResolvedValue(null),
    markUsedAndInsertSuccessor: jest.fn().mockResolvedValue(true),
    wasUsedWithinGrace: jest.fn().mockResolvedValue(false),
    revokeFamily: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    revokeByZitadelSessionId: jest.fn().mockResolvedValue(undefined),
    revokeSsoForUser: jest.fn().mockResolvedValue(undefined),
    revokeAllForUserExceptFamily: jest.fn().mockResolvedValue(undefined),
    deleteExpired: jest.fn().mockResolvedValue(0),
  };
}
