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

  it('should sign an access token with its configured expiry', async () => {
    configService.get.mockReturnValue({
      secret: 'super-secret',
      expiresIn: '1h',
      refreshTokenExpiresIn: '7d',
    });
    jwtService.sign.mockReturnValueOnce('signed-access-token');

    const accessToken = await repository.generateAccessToken(user);

    // Access token stays untyped (JwtStrategy rejects typed tokens) and no
    // refresh token is signed here — refresh is now an opaque stored session.
    expect(jwtService.sign).toHaveBeenCalledTimes(1);
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: user.id, email: user.email }),
      { expiresIn: '1h' },
    );
    expect(accessToken).toBe('signed-access-token');
  });

  it('should throw when the JWT configuration is missing', async () => {
    configService.get.mockReturnValue(undefined);

    await expect(repository.generateAccessToken(user)).rejects.toThrow(
      'JWT configuration is missing',
    );
  });
});
