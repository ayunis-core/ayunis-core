import { AssertCachedOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-cached-org-active/assert-cached-org-active.use-case';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { UUID } from 'crypto';
import { JwtStrategy } from './jwt.strategy';
import { JWT_SECRET } from 'src/iam/authentication/application/tokens/jwt-secret.token';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const validAccessPayload = {
    sub: '123e4567-e89b-12d3-a456-426614174000' as UUID,
    email: 'amtsleiter@musterstadt.de',
    emailVerified: true,
    role: UserRole.ADMIN,
    systemRole: SystemRole.CUSTOMER,
    orgId: '123e4567-e89b-12d3-a456-426614174001' as UUID,
    name: 'Amtsleiter',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: AssertCachedOrgActiveUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue({ sessionVersion: 0 }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('access_token') },
        },
        { provide: JWT_SECRET, useValue: 'super-secret' },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return an ActiveUser for a valid access payload', async () => {
    const result = await strategy.validate(validAccessPayload);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(validAccessPayload.sub);
    expect(result?.email).toBe(validAccessPayload.email);
  });

  it('should reject a typed token (e.g. refresh) presented as access', async () => {
    expect(
      await strategy.validate({ ...validAccessPayload, type: 'refresh' }),
    ).toBeNull();
  });

  it('should reject a bare {sub} payload with no email', async () => {
    expect(
      await strategy.validate({
        sub: validAccessPayload.sub,
      } as unknown as typeof validAccessPayload),
    ).toBeNull();
  });

  describe('token sources', () => {
    const jwt = new JwtService({ secret: 'super-secret' });
    const webToken = jwt.sign(validAccessPayload);
    const paneToken = jwt.sign({ ...validAccessPayload, client: 'outlook' });

    function authenticate(request: {
      cookies?: Record<string, string>;
      authorization?: string;
    }): Promise<ActiveUser | null> {
      const req = {
        cookies: request.cookies ?? {},
        headers: request.authorization
          ? { authorization: request.authorization }
          : {},
      } as unknown as Request;
      return new Promise((resolve, reject) => {
        const attempt = Object.create(strategy) as JwtStrategy & {
          success: (user: ActiveUser) => void;
          fail: () => void;
          error: (err: Error) => void;
        };
        attempt.success = (user) => resolve(user);
        attempt.fail = () => resolve(null);
        attempt.error = reject;
        attempt.authenticate(req, {});
      });
    }

    it('authenticates a Bearer access token and carries its client', async () => {
      const user = await authenticate({ authorization: `Bearer ${paneToken}` });

      expect(user?.id).toBe(validAccessPayload.sub);
      expect(user?.client).toBe('outlook');
    });

    it('prefers the session cookie over a Bearer token', async () => {
      const user = await authenticate({
        cookies: { access_token: webToken },
        authorization: `Bearer ${paneToken}`,
      });

      expect(user?.client).toBeNull();
    });

    it('rejects an API key presented as a Bearer token', async () => {
      await expect(
        authenticate({ authorization: 'Bearer ayk_live_0123456789abcdef' }),
      ).resolves.toBeNull();
    });

    it.each([
      ['a typed token', { ...validAccessPayload, type: 'mfa_pending' }],
      ['a token without email', { sub: validAccessPayload.sub }],
      ['a token for an unknown client', { ...validAccessPayload, client: 'x' }],
    ])('rejects %s presented as a Bearer token', async (_case, payload) => {
      await expect(
        authenticate({ authorization: `Bearer ${jwt.sign(payload)}` }),
      ).resolves.toBeNull();
    });
  });
});
