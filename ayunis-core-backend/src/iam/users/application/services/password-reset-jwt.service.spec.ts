import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { PasswordResetJwtService } from './password-reset-jwt.service';
import { InvalidTokenError } from '../../../authentication/application/authentication.errors';

describe('PasswordResetJwtService', () => {
  let service: PasswordResetJwtService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const email = 'sachbearbeiter@musterstadt.de';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetJwtService,
        {
          provide: JwtService,
          useValue: { sign: jest.fn(), verify: jest.fn() },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get(PasswordResetJwtService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('should sign the password reset token with the configured password reset expiry', () => {
    configService.get.mockReturnValue('2h');
    jwtService.sign.mockReturnValue('signed-reset-token');

    const token = service.generatePasswordResetToken({ userId, email });

    expect(configService.get).toHaveBeenCalledWith(
      'auth.jwt.passwordResetExpiresIn',
      '2h',
    );
    expect(jwtService.sign).toHaveBeenCalledWith(
      { userId, email },
      { expiresIn: '2h' },
    );
    expect(token).toBe('signed-reset-token');
  });

  it('should sign the initial password token with the configured initial password expiry', () => {
    configService.get.mockReturnValue('7d');
    jwtService.sign.mockReturnValue('signed-initial-token');

    const token = service.generateInitialPasswordToken({ userId, email });

    expect(configService.get).toHaveBeenCalledWith(
      'auth.jwt.initialPasswordExpiresIn',
      '7d',
    );
    expect(jwtService.sign).toHaveBeenCalledWith(
      { userId, email },
      { expiresIn: '7d' },
    );
    expect(token).toBe('signed-initial-token');
  });

  it('should verify a valid untyped reset token', () => {
    jwtService.verify.mockReturnValue({ userId, email });

    expect(service.verifyPasswordResetToken('token')).toEqual({
      userId,
      email,
    });
  });

  // Regression for V1: an email-confirmation token carries the same
  // `{userId, email}` shape and the same signing secret. It must never be
  // redeemable here as a password reset. Type discrimination closes the hole.
  it('should reject a token carrying a type claim (e.g. email confirmation)', () => {
    jwtService.verify.mockReturnValue({
      userId,
      email,
      type: 'email_confirmation',
    });

    expect(() =>
      service.verifyPasswordResetToken('confirmation-token'),
    ).toThrow(InvalidTokenError);
  });

  it('should reject a token missing userId or email', () => {
    jwtService.verify.mockReturnValue({ email });

    expect(() => service.verifyPasswordResetToken('partial-token')).toThrow(
      InvalidTokenError,
    );
  });
});
