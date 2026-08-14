import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { MfaPendingJwtService } from 'src/iam/authentication/application/services/mfa-pending-jwt.service';
import { InvalidMfaPendingTokenError } from 'src/iam/authentication/application/authentication.errors';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

describe('MfaPendingJwtService', () => {
  const userId = 'user-id-123' as UUID;
  let service: MfaPendingJwtService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      providers: [
        MfaPendingJwtService,
        {
          provide: getLoggerToken(MfaPendingJwtService.name),
          useValue: createPinoLoggerMock(),
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get(MfaPendingJwtService);
    jwtService = module.get(JwtService);
  });

  it('round-trips a pending token with its payload', () => {
    const token = service.generate({
      userId,
      enrollmentRequired: true,
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: '385820595704563912',
    });
    const payload = service.verify(token);

    expect(payload.sub).toBe(userId);
    expect(payload.type).toBe('mfa_pending');
    expect(payload.enrollmentRequired).toBe(true);
    expect(payload).toMatchObject({
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: '385820595704563912',
    });
  });

  it('rejects a session-style token without a type claim', () => {
    const sessionLikeToken = jwtService.sign({ sub: userId });

    expect(() => service.verify(sessionLikeToken)).toThrow(
      InvalidMfaPendingTokenError,
    );
  });

  it('rejects a token with a different type claim', () => {
    const otherTypedToken = jwtService.sign({ sub: userId, type: 'other' });

    expect(() => service.verify(otherTypedToken)).toThrow(
      InvalidMfaPendingTokenError,
    );
  });

  it('defaults an in-flight legacy password challenge to password provenance', () => {
    const legacyToken = jwtService.sign({
      sub: userId,
      type: 'mfa_pending',
      enrollmentRequired: false,
    });

    expect(service.verify(legacyToken)).toMatchObject({
      authenticationMethod: SessionAuthenticationMethod.PASSWORD,
      zitadelSessionId: null,
    });
  });

  it('rejects unsupported authentication provenance', () => {
    const invalid = jwtService.sign({
      sub: userId,
      type: 'mfa_pending',
      enrollmentRequired: false,
      authenticationMethod: 'broker',
    });

    expect(() => service.verify(invalid)).toThrow(InvalidMfaPendingTokenError);
  });

  it('rejects an expired pending token', () => {
    const expired = jwtService.sign(
      { sub: userId, type: 'mfa_pending', enrollmentRequired: false },
      { expiresIn: '-1s' },
    );

    expect(() => service.verify(expired)).toThrow(InvalidMfaPendingTokenError);
  });

  it('rejects garbage tokens', () => {
    expect(() => service.verify('not-a-jwt')).toThrow(
      InvalidMfaPendingTokenError,
    );
  });
});
