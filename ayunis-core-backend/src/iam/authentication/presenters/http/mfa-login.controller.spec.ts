import type { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import type { Request, Response } from 'express';
import { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { MfaLoginController } from 'src/iam/authentication/presenters/http/mfa-login.controller';
import type { MfaPendingJwtService } from 'src/iam/authentication/application/services/mfa-pending-jwt.service';
import type { ConfirmTotpUseCase } from 'src/iam/mfa/application/use-cases/confirm-totp/confirm-totp.use-case';
import type { SetupTotpUseCase } from 'src/iam/mfa/application/use-cases/setup-totp/setup-totp.use-case';
import type { VerifyMfaCodeUseCase } from 'src/iam/mfa/application/use-cases/verify-mfa-code/verify-mfa-code.use-case';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import type { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { LoginUseCase } from 'src/iam/authentication/application/use-cases/login/login.use-case';

describe(MfaLoginController.name, () => {
  const userId = 'f532bbf9-1f0a-4a8d-b08b-4f2e8da09a7e' as UUID;
  const orgId = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4' as UUID;
  const login = { execute: jest.fn() };
  const verifyMfa = { execute: jest.fn() };
  const findUser = { execute: jest.fn() };
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
    verifyMfa as unknown as VerifyMfaCodeUseCase,
    { execute: jest.fn() } as unknown as SetupTotpUseCase,
    { execute: jest.fn() } as unknown as ConfirmTotpUseCase,
    findUser as unknown as FindUserByIdUseCase,
    login as unknown as LoginUseCase,
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
    findUser.execute.mockResolvedValue(
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
    login.execute.mockResolvedValue(new AuthTokens('access', 'refresh'));
  });

  it('preserves SSO provenance when MFA verification creates the session', async () => {
    const request = {
      cookies: { mfa_pending_token: 'signed-pending-token' },
    } as unknown as Request;

    await controller.verify(request, response, { code: '123456' });

    expect(login.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticationMethod: SessionAuthenticationMethod.SSO,
        zitadelSessionId: '385820595704563912',
      }),
    );
  });
});
