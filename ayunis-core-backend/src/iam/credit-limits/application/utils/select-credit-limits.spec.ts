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

  const userLimit = aUserCreditLimit({ monthlyCredits: 5000 });
  const teamLimit = aTeamCreditLimit({ monthlyCredits: 20000 });

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
