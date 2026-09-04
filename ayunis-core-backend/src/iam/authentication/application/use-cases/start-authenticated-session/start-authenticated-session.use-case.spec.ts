import { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { StartAuthenticatedSessionCommand } from 'src/iam/authentication/application/use-cases/start-authenticated-session/start-authenticated-session.command';
import { StartAuthenticatedSessionUseCase } from 'src/iam/authentication/application/use-cases/start-authenticated-session/start-authenticated-session.use-case';
import type { LoginUseCase } from 'src/iam/authentication/application/use-cases/login/login.use-case';
import type { CheckMfaLoginRequirementUseCase } from 'src/iam/mfa/application/use-cases/check-mfa-login-requirement/check-mfa-login-requirement.use-case';
import type { MfaPendingJwtService } from 'src/iam/authentication/application/services/mfa-pending-jwt.service';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { AuthorizeUserLoginUseCase } from 'src/iam/users/application/use-cases/authorize-user-login/authorize-user-login.use-case';
import { UserAuthenticationFailedError } from 'src/iam/users/application/users.errors';
import type { LocalPasswordLoginPolicyService } from 'src/iam/authentication/application/services/local-password-login-policy.service';
import { LocalPasswordLoginDisabledError } from 'src/iam/authentication/application/authentication.errors';

describe(StartAuthenticatedSessionUseCase.name, () => {
  const user = new ActiveUser({
    id: 'f532bbf9-1f0a-4a8d-b08b-4f2e8da09a7e',
    email: 'siro@qa-stadt.local',
    emailVerified: true,
    role: UserRole.USER,
    systemRole: SystemRole.CUSTOMER,
    orgId: 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
    name: 'Siro Tester',
  });
  const login = { execute: jest.fn() };
  const checkMfa = { execute: jest.fn() };
  const pendingTokens = { generate: jest.fn() };
  const authorizeUserLogin = { execute: jest.fn() };
  const passwordPolicy = { assertAllowedForOrg: jest.fn() };
  const useCase = new StartAuthenticatedSessionUseCase(
    checkMfa as unknown as CheckMfaLoginRequirementUseCase,
    pendingTokens as unknown as MfaPendingJwtService,
    login as unknown as LoginUseCase,
    authorizeUserLogin as unknown as AuthorizeUserLoginUseCase,
    passwordPolicy as unknown as LocalPasswordLoginPolicyService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    authorizeUserLogin.execute.mockResolvedValue(undefined);
    passwordPolicy.assertAllowedForOrg.mockReset().mockResolvedValue(undefined);
  });

  it('creates the SSO session immediately when Core MFA is not required', async () => {
    checkMfa.execute.mockResolvedValue('none');
    login.execute.mockResolvedValue(new AuthTokens('access', 'refresh'));

    await expect(useCase.execute(ssoCommand())).resolves.toEqual({
      status: 'authenticated',
      tokens: new AuthTokens('access', 'refresh'),
    });
    expect(login.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticationMethod: SessionAuthenticationMethod.SSO,
        zitadelSessionId: '385820595704563912',
      }),
    );
    expect(pendingTokens.generate).not.toHaveBeenCalled();
  });

  it('retains SSO provenance while waiting for an enrolled MFA factor', async () => {
    checkMfa.execute.mockResolvedValue('verify');
    pendingTokens.generate.mockReturnValue('signed-pending-token');

    await expect(useCase.execute(ssoCommand())).resolves.toEqual({
      status: 'mfa_required',
      mfaPendingToken: 'signed-pending-token',
      enrollmentRequired: false,
    });
    expect(pendingTokens.generate).toHaveBeenCalledWith({
      userId: user.id,
      enrollmentRequired: false,
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: '385820595704563912',
    });
    expect(authorizeUserLogin.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: user.id }),
    );
    expect(login.execute).not.toHaveBeenCalled();
  });

  it('requires enrollment before starting the session when the org mandates MFA', async () => {
    checkMfa.execute.mockResolvedValue('enroll');
    pendingTokens.generate.mockReturnValue('signed-pending-token');

    await expect(useCase.execute(ssoCommand())).resolves.toMatchObject({
      status: 'mfa_required',
      enrollmentRequired: true,
    });
  });

  it('preserves a password session when Core MFA is not required', async () => {
    checkMfa.execute.mockResolvedValue('none');
    login.execute.mockResolvedValue(new AuthTokens('access', 'refresh'));

    await useCase.execute(passwordCommand());

    expect(login.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticationMethod: SessionAuthenticationMethod.PASSWORD,
        zitadelSessionId: null,
      }),
    );
  });

  it('preserves password provenance while waiting for Core MFA', async () => {
    checkMfa.execute.mockResolvedValue('verify');
    pendingTokens.generate.mockReturnValue('signed-pending-token');

    await useCase.execute(passwordCommand());

    expect(pendingTokens.generate).toHaveBeenCalledWith({
      userId: user.id,
      enrollmentRequired: false,
      authenticationMethod: SessionAuthenticationMethod.PASSWORD,
      zitadelSessionId: null,
    });
  });

  it('does not issue a pending MFA token when password login is disabled', async () => {
    checkMfa.execute.mockResolvedValue('verify');
    passwordPolicy.assertAllowedForOrg.mockRejectedValue(
      new LocalPasswordLoginDisabledError(),
    );

    await expect(useCase.execute(passwordCommand())).rejects.toBeInstanceOf(
      LocalPasswordLoginDisabledError,
    );
    expect(pendingTokens.generate).not.toHaveBeenCalled();
  });

  it('does not repeat Core MFA when the broker verified multiple factors', async () => {
    login.execute.mockResolvedValue(new AuthTokens('access', 'refresh'));

    await useCase.execute(
      new StartAuthenticatedSessionCommand(
        user,
        SessionAuthenticationMethod.SSO,
        '385820595704563912',
        true,
      ),
    );

    expect(checkMfa.execute).not.toHaveBeenCalled();
    expect(login.execute).toHaveBeenCalled();
  });

  it('never accepts broker assurance for a password login', async () => {
    checkMfa.execute.mockResolvedValue('verify');
    pendingTokens.generate.mockReturnValue('signed-pending-token');

    await useCase.execute(
      new StartAuthenticatedSessionCommand(
        user,
        SessionAuthenticationMethod.PASSWORD,
        null,
        true,
      ),
    );

    expect(checkMfa.execute).toHaveBeenCalled();
    expect(login.execute).not.toHaveBeenCalled();
  });

  it('withholds an MFA pending token when the account is locked', async () => {
    checkMfa.execute.mockResolvedValue('verify');
    authorizeUserLogin.execute.mockRejectedValue(
      new UserAuthenticationFailedError('Invalid credentials'),
    );

    await expect(useCase.execute(passwordCommand())).rejects.toThrow(
      UserAuthenticationFailedError,
    );
    expect(pendingTokens.generate).not.toHaveBeenCalled();
  });

  function ssoCommand(): StartAuthenticatedSessionCommand {
    return new StartAuthenticatedSessionCommand(
      user,
      SessionAuthenticationMethod.SSO,
      '385820595704563912',
    );
  }

  function passwordCommand(): StartAuthenticatedSessionCommand {
    return new StartAuthenticatedSessionCommand(
      user,
      SessionAuthenticationMethod.PASSWORD,
      null,
    );
  }
});
