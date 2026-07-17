import type { UUID } from 'crypto';
import { PasswordSetToken } from '../../domain/password-set-token.entity';
import { PasswordSetTokenPurpose } from '../../domain/value-objects/password-set-token-purpose.enum';
import type { PasswordSetTokensRepository } from '../ports/password-set-tokens.repository';

// Shared identifiers — one source of truth for password-set-token test IDs.
export const TEST_USER_ID = '22222222-2222-2222-2222-222222222222' as UUID;
export const TEST_TOKEN_ID = '44444444-4444-4444-4444-444444444444' as UUID;

// Domain builder — a valid, unused, unexpired reset token by default. Override
// only what a test asserts.
export function aPasswordSetToken(
  overrides: Partial<{
    id: UUID;
    userId: UUID;
    tokenHash: string;
    purpose: PasswordSetTokenPurpose;
    expiresAt: Date;
    usedAt: Date | null;
  }> = {},
): PasswordSetToken {
  return new PasswordSetToken({
    id: overrides.id ?? TEST_TOKEN_ID,
    userId: overrides.userId ?? TEST_USER_ID,
    tokenHash: overrides.tokenHash ?? 'sha256-hash',
    purpose: overrides.purpose ?? PasswordSetTokenPurpose.RESET,
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
    usedAt: overrides.usedAt ?? null,
  });
}

// Port mock factory — defaults model the "empty" state: finders resolve to
// null, consume succeeds, mutators resolve. Tests override per case.
export function createMockPasswordSetTokensRepository(): jest.Mocked<PasswordSetTokensRepository> {
  return {
    replaceForUser: jest.fn().mockResolvedValue(undefined),
    findByTokenHash: jest.fn().mockResolvedValue(null),
    consume: jest.fn().mockResolvedValue(true),
    deleteExpiredOrUsed: jest.fn().mockResolvedValue(0),
  };
}
