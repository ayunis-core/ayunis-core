import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { EmailConfirmationJwtService } from './email-confirmation-jwt.service';

describe('EmailConfirmationJwtService', () => {
  let service: EmailConfirmationJwtService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const email = 'buergermeister@musterstadt.de';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailConfirmationJwtService,
        {
          provide: JwtService,
          useValue: { sign: jest.fn(), verify: jest.fn(), decode: jest.fn() },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get(EmailConfirmationJwtService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('should sign the confirmation token with the configured email confirmation expiry', () => {
    configService.get.mockReturnValue('24h');
    jwtService.sign.mockReturnValue('signed-confirmation-token');

    const token = service.generateEmailConfirmationToken({ userId, email });

    expect(configService.get).toHaveBeenCalledWith(
      'auth.jwt.emailConfirmationExpiresIn',
      '24h',
    );
    expect(jwtService.sign).toHaveBeenCalledWith(
      { userId, email },
      { expiresIn: '24h' },
    );
    expect(token).toBe('signed-confirmation-token');
  });
});
