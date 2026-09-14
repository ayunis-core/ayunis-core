jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { CompleteMfaLoginCommand } from 'src/iam/authentication/application/use-cases/complete-mfa-login/complete-mfa-login.command';
import { CompleteMfaLoginUseCase } from 'src/iam/authentication/application/use-cases/complete-mfa-login/complete-mfa-login.use-case';
import type { LoginUseCase } from 'src/iam/authentication/application/use-cases/login/login.use-case';
import type { LocalPasswordLoginPolicyService } from 'src/iam/authentication/application/services/local-password-login-policy.service';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { aUser } from 'src/iam/users/application/testing/user.fixtures';
import type { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import type { ConfirmTotpUseCase } from 'src/iam/mfa/application/use-cases/confirm-totp/confirm-totp.use-case';
import type { VerifyMfaCodeUseCase } from 'src/iam/mfa/application/use-cases/verify-mfa-code/verify-mfa-code.use-case';

describe(CompleteMfaLoginUseCase.name, () => {
  const user = aUser();
  const tokens = new AuthTokens('access-token', 'refresh-token');
  const findUser = { execute: jest.fn().mockResolvedValue(user) };
  const policy = { assertSessionIssuanceAllowed: jest.fn() };
  const verifyMfaCode = { execute: jest.fn() };
  const confirmTotp = { execute: jest.fn() };
  const login = { execute: jest.fn().mockResolvedValue(tokens) };
  const useCase = new CompleteMfaLoginUseCase(
    findUser as unknown as FindUserByIdUseCase,
    policy as unknown as LocalPasswordLoginPolicyService,
    verifyMfaCode as unknown as VerifyMfaCodeUseCase,
    confirmTotp as unknown as ConfirmTotpUseCase,
    login as unknown as LoginUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findUser.execute.mockResolvedValue(user);
    login.execute.mockResolvedValue(tokens);
  });

  it('locks password policy before consuming an MFA code', async () => {
    const result = await useCase.execute(command('verify'));

    expect(result).toEqual({ tokens, recoveryCodes: null });
    expect(policy.assertSessionIssuanceAllowed).toHaveBeenCalledWith(
      user.orgId,
      SessionAuthenticationMethod.PASSWORD,
    );
    expect(
      policy.assertSessionIssuanceAllowed.mock.invocationCallOrder[0],
    ).toBeLessThan(verifyMfaCode.execute.mock.invocationCallOrder[0]);
    expect(confirmTotp.execute).not.toHaveBeenCalled();
  });

  it('returns recovery codes after confirming enrollment', async () => {
    confirmTotp.execute.mockResolvedValue(['RECOVERY-CODE']);

    const result = await useCase.execute(command('confirmEnrollment'));

    expect(result).toEqual({
      tokens,
      recoveryCodes: ['RECOVERY-CODE'],
    });
    expect(verifyMfaCode.execute).not.toHaveBeenCalled();
  });

  function command(
    operation: 'verify' | 'confirmEnrollment',
  ): CompleteMfaLoginCommand {
    return new CompleteMfaLoginCommand({
      userId: user.id,
      code: '123456',
      operation,
      authenticationMethod: SessionAuthenticationMethod.PASSWORD,
      zitadelSessionId: null,
    });
  }
});
