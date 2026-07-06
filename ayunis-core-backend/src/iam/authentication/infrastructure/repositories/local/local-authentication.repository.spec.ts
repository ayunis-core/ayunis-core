import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LocalAuthenticationRepository } from './local-authentication.repository';
import { ActiveUser } from '../../../domain/active-user.entity';
import { UserRole } from '../../../../users/domain/value-objects/role.object';
import { SystemRole } from '../../../../users/domain/value-objects/system-role.enum';

describe('LocalAuthenticationRepository', () => {
  let repository: LocalAuthenticationRepository;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const user = new ActiveUser({
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'amtsleiter@musterstadt.de',
    emailVerified: true,
    role: UserRole.ADMIN,
    systemRole: SystemRole.CUSTOMER,
    orgId: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Amtsleiter',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalAuthenticationRepository,
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    repository = module.get(LocalAuthenticationRepository);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('should sign access and refresh tokens with their configured expiries', async () => {
    configService.get.mockReturnValue({
      secret: 'super-secret',
      expiresIn: '1h',
      refreshTokenExpiresIn: '7d',
    });
    jwtService.sign
      .mockReturnValueOnce('signed-access-token')
      .mockReturnValueOnce('signed-refresh-token');

    const tokens = await repository.generateTokens(user);

    expect(jwtService.sign).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sub: user.id, email: user.email }),
      { expiresIn: '1h' },
    );
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      2,
      { sub: user.id },
      { expiresIn: '7d' },
    );
    expect(tokens).toEqual({
      access_token: 'signed-access-token',
      refresh_token: 'signed-refresh-token',
    });
  });

  it('should throw when the JWT configuration is missing', () => {
    configService.get.mockReturnValue(undefined);

    expect(() => repository.generateTokens(user)).toThrow(
      'JWT configuration is missing',
    );
  });
});
