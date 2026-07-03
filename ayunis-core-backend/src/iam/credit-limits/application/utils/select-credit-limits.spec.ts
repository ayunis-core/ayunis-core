import type { UUID } from 'crypto';
import { UserCreditLimit } from '../../domain/user-credit-limit.entity';
import { TeamCreditLimit } from '../../domain/team-credit-limit.entity';
import { selectUserCreditLimits } from './select-user-credit-limits';
import { selectTeamCreditLimits } from './select-team-credit-limits';

describe('credit limit selectors', () => {
  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const userId = '22222222-2222-2222-2222-222222222222' as UUID;
  const teamId = '33333333-3333-3333-3333-333333333333' as UUID;

  it('flattens user limits into their read shape', () => {
    const userLimit = new UserCreditLimit({
      orgId,
      userId,
      monthlyCredits: 5000,
    });

    expect(selectUserCreditLimits([userLimit])).toEqual([
      { userId, monthlyCredits: 5000 },
    ]);
  });

  it('flattens team limits into their read shape', () => {
    const teamLimit = new TeamCreditLimit({
      orgId,
      teamId,
      monthlyCredits: 20000,
    });

    expect(selectTeamCreditLimits([teamLimit])).toEqual([
      { teamId, monthlyCredits: 20000 },
    ]);
  });

  it('returns an empty list for empty input', () => {
    expect(selectUserCreditLimits([])).toEqual([]);
    expect(selectTeamCreditLimits([])).toEqual([]);
  });
});
