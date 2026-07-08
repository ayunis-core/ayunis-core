import {
  aTeamCreditLimit,
  aUserCreditLimit,
  TEST_TEAM_ID,
  TEST_USER_ID,
} from '../testing/credit-limit.fixtures';
import { selectUserCreditLimits } from './select-user-credit-limits';
import { selectTeamCreditLimits } from './select-team-credit-limits';

describe('credit limit selectors', () => {
  const userId = TEST_USER_ID;
  const teamId = TEST_TEAM_ID;

  it('flattens user limits into their read shape', () => {
    const userLimit = aUserCreditLimit();

    expect(selectUserCreditLimits([userLimit])).toEqual([
      { userId, monthlyCredits: 5000 },
    ]);
  });

  it('flattens team limits into their read shape', () => {
    const teamLimit = aTeamCreditLimit();

    expect(selectTeamCreditLimits([teamLimit])).toEqual([
      { teamId, monthlyCredits: 20000 },
    ]);
  });

  it('returns an empty list for empty input', () => {
    expect(selectUserCreditLimits([])).toEqual([]);
    expect(selectTeamCreditLimits([])).toEqual([]);
  });
});
