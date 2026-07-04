import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { MfaPendingJwtService } from './mfa-pending-jwt.service';
import { InvalidMfaPendingTokenError } from '../mfa.errors';

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
    const token = service.generate({ userId, enrollmentRequired: true });
    const payload = service.verify(token);

    expect(payload.sub).toBe(userId);
    expect(payload.type).toBe('mfa_pending');
    expect(payload.enrollmentRequired).toBe(true);
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
