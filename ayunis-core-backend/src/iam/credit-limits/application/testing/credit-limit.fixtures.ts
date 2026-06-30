import type { UUID } from 'crypto';
import { CreditLimit } from '../../domain/credit-limit.entity';
import { CreditLimitScope } from '../../domain/value-objects/credit-limit-scope.enum';
import type { CreditLimitRepository } from '../ports/credit-limit.repository';

/**
 * Test-only fixtures for the credit-limits module: shared identifiers, a
 * domain-entity builder, and a port mock factory.
 *
 * This file lives under `testing/` (excluded from the production build and
 * coverage) because it depends on the `jest` global. Import it only from
 * `*.spec.ts` files.
 */

export const TEST_ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;
export const TEST_USER_ID = '22222222-2222-2222-2222-222222222222' as UUID;
export const TEST_TEAM_ID = '33333333-3333-3333-3333-333333333333' as UUID;

interface CreditLimitOverrides {
  orgId?: UUID;
  monthlyCredits?: number;
  id?: UUID;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Build a USER-scoped CreditLimit with sensible defaults. */
export function aUserCreditLimit(
  overrides: CreditLimitOverrides & { userId?: UUID } = {},
): CreditLimit {
  const {
    userId = TEST_USER_ID,
    orgId = TEST_ORG_ID,
    monthlyCredits = 5000,
    ...rest
  } = overrides;
  return new CreditLimit({
    orgId,
    target: { scope: CreditLimitScope.USER, userId },
    monthlyCredits,
    ...rest,
  });
}

/** Build a TEAM-scoped CreditLimit with sensible defaults. */
export function aTeamCreditLimit(
  overrides: CreditLimitOverrides & { teamId?: UUID } = {},
): CreditLimit {
  const {
    teamId = TEST_TEAM_ID,
    orgId = TEST_ORG_ID,
    monthlyCredits = 20000,
    ...rest
  } = overrides;
  return new CreditLimit({
    orgId,
    target: { scope: CreditLimitScope.TEAM, teamId },
    monthlyCredits,
    ...rest,
  });
}

/**
 * A fully-stubbed CreditLimitRepository. Defaults model an empty org: finders
 * resolve to null/[], `save` echoes its argument, deletes resolve. Override
 * individual methods per test with `.mockResolvedValue(...)`.
 */
export function createMockCreditLimitRepository(): jest.Mocked<CreditLimitRepository> {
  return {
    save: jest.fn((limit: CreditLimit) => Promise.resolve(limit)),
    findByOrg: jest.fn().mockResolvedValue([]),
    findByUserId: jest.fn().mockResolvedValue(null),
    findByTeamId: jest.fn().mockResolvedValue(null),
    findByTeamIds: jest.fn().mockResolvedValue([]),
    deleteByUserId: jest.fn().mockResolvedValue(undefined),
    deleteByTeamId: jest.fn().mockResolvedValue(undefined),
  };
}
