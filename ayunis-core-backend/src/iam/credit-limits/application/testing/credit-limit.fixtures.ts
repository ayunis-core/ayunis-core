import type { UUID } from 'crypto';
import { UserCreditLimit } from '../../domain/user-credit-limit.entity';
import { TeamCreditLimit } from '../../domain/team-credit-limit.entity';
import type { CreditLimitRepository } from '../ports/credit-limit.repository';

// Shared identifiers — one source of truth for credit-limits test IDs.
export const TEST_ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;
export const TEST_USER_ID = '22222222-2222-2222-2222-222222222222' as UUID;
export const TEST_TEAM_ID = '33333333-3333-3333-3333-333333333333' as UUID;

// Domain builders — sensible defaults, override only what a test asserts.
// One builder per entity subclass, so no discriminated union to juggle.
export function aUserCreditLimit(
  overrides: { orgId?: UUID; userId?: UUID; monthlyCredits?: number } = {},
): UserCreditLimit {
  const {
    orgId = TEST_ORG_ID,
    userId = TEST_USER_ID,
    monthlyCredits = 5000,
  } = overrides;
  return new UserCreditLimit({ orgId, userId, monthlyCredits });
}

export function aTeamCreditLimit(
  overrides: { orgId?: UUID; teamId?: UUID; monthlyCredits?: number } = {},
): TeamCreditLimit {
  const {
    orgId = TEST_ORG_ID,
    teamId = TEST_TEAM_ID,
    monthlyCredits = 20000,
  } = overrides;
  return new TeamCreditLimit({ orgId, teamId, monthlyCredits });
}

// Port mock factory — defaults model the "empty" state: finders resolve to
// null/[], save echoes its argument, deletes resolve. Tests override per case.
export function createMockCreditLimitRepository(): jest.Mocked<CreditLimitRepository> {
  return {
    save: jest.fn().mockImplementation((limit) => Promise.resolve(limit)),
    findUserLimits: jest.fn().mockResolvedValue([]),
    findTeamLimits: jest.fn().mockResolvedValue([]),
    findByUserId: jest.fn().mockResolvedValue(null),
    findByTeamId: jest.fn().mockResolvedValue(null),
    findByTeamIds: jest.fn().mockResolvedValue([]),
    deleteByUserId: jest.fn().mockResolvedValue(undefined),
    deleteByTeamId: jest.fn().mockResolvedValue(undefined),
    deleteByOrg: jest.fn().mockResolvedValue(undefined),
  };
}
