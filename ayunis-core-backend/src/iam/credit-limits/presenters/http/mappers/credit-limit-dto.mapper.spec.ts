import {
  aDefaultUserCreditLimit,
  anApiKeyCreditLimit,
  aTeamCreditLimit,
  aUserCreditLimit,
} from 'src/iam/credit-limits/application/testing/credit-limit.fixtures';
import { CreditLimitScope } from 'src/iam/credit-limits/domain/value-objects/credit-limit-scope.enum';
import { CreditLimitDtoMapper } from './credit-limit-dto.mapper';

describe('CreditLimitDtoMapper scope contract', () => {
  const mapper = new CreditLimitDtoMapper();

  it.each([
    [() => mapper.toUserDto(aUserCreditLimit()), CreditLimitScope.USER],
    [() => mapper.toTeamDto(aTeamCreditLimit()), CreditLimitScope.TEAM],
    [() => mapper.toApiKeyDto(anApiKeyCreditLimit()), CreditLimitScope.API_KEY],
    [
      () => mapper.toDefaultUserDto(aDefaultUserCreditLimit()),
      CreditLimitScope.USER_DEFAULT,
    ],
    [() => mapper.toDefaultUserDto(null), CreditLimitScope.USER_DEFAULT],
  ] as const)('identifies the %s response as %s', (response, scope) => {
    expect(response()).toEqual(expect.objectContaining({ scope }));
  });
});
