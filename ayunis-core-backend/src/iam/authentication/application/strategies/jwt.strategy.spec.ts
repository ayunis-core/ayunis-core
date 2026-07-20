import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { JwtStrategy } from './jwt.strategy';
import { JWT_SECRET } from '../tokens/jwt-secret.token';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

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
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('access_token') },
        },
        { provide: JWT_SECRET, useValue: 'super-secret' },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);

    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('should return an ActiveUser for a valid access payload', () => {
    const result = strategy.validate(validAccessPayload);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(validAccessPayload.sub);
    expect(result?.email).toBe(validAccessPayload.email);
  });

  it('should reject a typed token (e.g. refresh) presented as access', () => {
    expect(
      strategy.validate({ ...validAccessPayload, type: 'refresh' }),
    ).toBeNull();
  });

  it('should reject a bare {sub} payload with no email', () => {
    expect(
      strategy.validate({
        sub: validAccessPayload.sub,
      } as unknown as typeof validAccessPayload),
    ).toBeNull();
  });
});
