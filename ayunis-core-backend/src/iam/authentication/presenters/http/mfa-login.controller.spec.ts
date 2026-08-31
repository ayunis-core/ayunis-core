import type { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import type { Request, Response } from 'express';
import { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { MfaLoginController } from 'src/iam/authentication/presenters/http/mfa-login.controller';
import type { MfaPendingJwtService } from 'src/iam/authentication/application/services/mfa-pending-jwt.service';
import type { SetupTotpUseCase } from 'src/iam/mfa/application/use-cases/setup-totp/setup-totp.use-case';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { LocalPasswordLoginDisabledError } from 'src/iam/authentication/application/authentication.errors';
import type { LocalPasswordLoginPolicyService } from 'src/iam/authentication/application/services/local-password-login-policy.service';
import type { CompleteMfaLoginUseCase } from 'src/iam/authentication/application/use-cases/complete-mfa-login/complete-mfa-login.use-case';
import { InvalidMfaCodeError } from 'src/iam/mfa/application/mfa.errors';

describe(MfaLoginController.name, () => {
  const userId = 'f532bbf9-1f0a-4a8d-b08b-4f2e8da09a7e' as UUID;
  const orgId = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4' as UUID;
  const setupTotp = { execute: jest.fn() };
  const completeMfaLogin = { execute: jest.fn() };
  const localPasswordLoginPolicy = { assertAllowedForUser: jest.fn() };
  const pendingTokens = { verify: jest.fn() };
  const config = {
    get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
  };
  const response = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const controller = new MfaLoginController(
    pendingTokens as unknown as MfaPendingJwtService,
    setupTotp as unknown as SetupTotpUseCase,
    completeMfaLogin as unknown as CompleteMfaLoginUseCase,
    localPasswordLoginPolicy as unknown as LocalPasswordLoginPolicyService,
    config as unknown as ConfigService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    pendingTokens.verify.mockReturnValue({
      sub: userId,
      type: 'mfa_pending',
      enrollmentRequired: false,
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: '385820595704563912',
    });
    localPasswordLoginPolicy.assertAllowedForUser.mockResolvedValue(
      new User({
        id: userId,
        email: 'siro@qa-stadt.local',
        emailVerified: true,
        passwordHash: null,
        role: UserRole.USER,
        orgId,
        name: 'Siro Tester',
        hasAcceptedMarketing: false,
      }),
    );
    completeMfaLogin.execute.mockResolvedValue({
      tokens: new AuthTokens('access', 'refresh'),
      recoveryCodes: null,
    });
  });

  it('preserves SSO provenance when MFA verification creates the session', async () => {
    const request = {
      cookies: { mfa_pending_token: 'signed-pending-token' },
    } as unknown as Request;

    await controller.verify(request, response, { code: '123456' });

    expect(completeMfaLogin.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'verify',
        authenticationMethod: SessionAuthenticationMethod.SSO,
        zitadelSessionId: '385820595704563912',
      }),
    );
  });

  it('does not complete a pending password MFA flow after SSO becomes required', async () => {
    pendingTokens.verify.mockReturnValue({
      sub: userId,
      type: 'mfa_pending',
      enrollmentRequired: false,
      authenticationMethod: SessionAuthenticationMethod.PASSWORD,
      zitadelSessionId: null,
    });
    completeMfaLogin.execute.mockRejectedValue(
      new LocalPasswordLoginDisabledError(),
    );
    const request = {
      cookies: { mfa_pending_token: 'password-flow-started-before-policy' },
    } as unknown as Request;

    await expect(
      controller.verify(request, response, { code: '123456' }),
    ).rejects.toBeInstanceOf(LocalPasswordLoginDisabledError);
    expect(response.cookie).not.toHaveBeenCalled();
    expect(response.clearCookie).toHaveBeenCalledTimes(1);
  });

  it('does not mutate MFA enrollment after SSO becomes required', async () => {
    pendingTokens.verify.mockReturnValue({
      sub: userId,
      type: 'mfa_pending',
      enrollmentRequired: true,
      authenticationMethod: SessionAuthenticationMethod.PASSWORD,
      zitadelSessionId: null,
    });
    localPasswordLoginPolicy.assertAllowedForUser.mockRejectedValue(
      new LocalPasswordLoginDisabledError(),
    );
    completeMfaLogin.execute.mockRejectedValue(
      new LocalPasswordLoginDisabledError(),
    );
    const request = {
      cookies: { mfa_pending_token: 'password-flow-started-before-policy' },
    } as unknown as Request;

    await expect(controller.setup(request, response)).rejects.toBeInstanceOf(
      LocalPasswordLoginDisabledError,
    );
    await expect(
      controller.confirmSetup(request, response, { code: '123456' }),
    ).rejects.toBeInstanceOf(LocalPasswordLoginDisabledError);

    expect(setupTotp.execute).not.toHaveBeenCalled();
    expect(response.clearCookie).toHaveBeenCalledTimes(2);
  });

  it('keeps the pending login after an invalid MFA code', async () => {
    completeMfaLogin.execute.mockRejectedValue(new InvalidMfaCodeError());
    const request = {
      cookies: { mfa_pending_token: 'signed-pending-token' },
    } as unknown as Request;

    await expect(
      controller.verify(request, response, { code: '000000' }),
    ).rejects.toBeInstanceOf(InvalidMfaCodeError);

    expect(response.clearCookie).not.toHaveBeenCalled();
  });
});
