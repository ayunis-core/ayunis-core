import type { UUID } from 'crypto';
import { CreditLimit } from '../../domain/credit-limit.entity';
import { CreditLimitScope } from '../../domain/value-objects/credit-limit-scope.enum';
import { selectUserCreditLimits } from './select-user-credit-limits';
import { selectTeamCreditLimits } from './select-team-credit-limits';

describe('credit limit selectors', () => {
  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const userId = '22222222-2222-2222-2222-222222222222' as UUID;
  const teamId = '33333333-3333-3333-3333-333333333333' as UUID;

  const userLimit = new CreditLimit({
    orgId,
    target: { scope: CreditLimitScope.USER, userId },
    monthlyCredits: 5000,
  });
  const teamLimit = new CreditLimit({
    orgId,
    target: { scope: CreditLimitScope.TEAM, teamId },
    monthlyCredits: 20000,
  });

  it('splits a mixed list by scope into flat read shapes', () => {
    const limits = [userLimit, teamLimit];

    expect(selectUserCreditLimits(limits)).toEqual([
      { userId, monthlyCredits: 5000 },
    ]);
    expect(selectTeamCreditLimits(limits)).toEqual([
      { teamId, monthlyCredits: 20000 },
    ]);
  });

  it('drops rows of the other scope entirely', () => {
    expect(selectUserCreditLimits([teamLimit])).toEqual([]);
    expect(selectTeamCreditLimits([userLimit])).toEqual([]);
  });

  it('returns an empty list for empty input', () => {
    expect(selectUserCreditLimits([])).toEqual([]);
    expect(selectTeamCreditLimits([])).toEqual([]);
  });
});
