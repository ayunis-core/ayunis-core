import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import {
  EmailConfirmationJwtService,
  EMAIL_CONFIRMATION_TOKEN_TYPE,
} from './email-confirmation-jwt.service';
import { InvalidEmailConfirmationTokenError } from '../users.errors';

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

  it('should sign the confirmation token with a type claim and the configured expiry', () => {
    configService.get.mockReturnValue('24h');
    jwtService.sign.mockReturnValue('signed-confirmation-token');

    const token = service.generateEmailConfirmationToken({ userId, email });

    expect(configService.get).toHaveBeenCalledWith(
      'auth.jwt.emailConfirmationExpiresIn',
      '24h',
    );
    expect(jwtService.sign).toHaveBeenCalledWith(
      { userId, email, type: EMAIL_CONFIRMATION_TOKEN_TYPE },
      { expiresIn: '24h' },
    );
    expect(token).toBe('signed-confirmation-token');
  });

  it('should verify a properly typed confirmation token', () => {
    jwtService.verify.mockReturnValue({
      userId,
      email,
      type: EMAIL_CONFIRMATION_TOKEN_TYPE,
    });

    expect(service.verifyEmailConfirmationToken('token')).toEqual({
      userId,
      email,
      type: EMAIL_CONFIRMATION_TOKEN_TYPE,
    });
  });

  it('should reject a legacy untyped confirmation token', () => {
    jwtService.verify.mockReturnValue({ userId, email });

    expect(() => service.verifyEmailConfirmationToken('legacy')).toThrow(
      InvalidEmailConfirmationTokenError,
    );
  });

  it('should reject a token typed as something other than email confirmation', () => {
    jwtService.verify.mockReturnValue({ userId, email, type: 'invite' });

    expect(() => service.verifyEmailConfirmationToken('foreign')).toThrow(
      InvalidEmailConfirmationTokenError,
    );
  });
});
