import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordSetTokenService } from './password-set-token.service';
import { PasswordSetTokensRepository } from '../ports/password-set-tokens.repository';
import { PasswordSetTokenPurpose } from '../../domain/value-objects/password-set-token-purpose.enum';
import { InvalidTokenError } from 'src/iam/authentication/application/authentication.errors';
import { sha256Hex } from 'src/common/util/sha256.util';
import {
  aPasswordSetToken,
  createMockPasswordSetTokensRepository,
  TEST_USER_ID,
} from '../testing/password-set-token.fixtures';

describe('PasswordSetTokenService', () => {
  let service: PasswordSetTokenService;
  let repository: jest.Mocked<PasswordSetTokensRepository>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    repository = createMockPasswordSetTokensRepository();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordSetTokenService,
        { provide: PasswordSetTokensRepository, useValue: repository },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, fallback: string) => fallback),
          },
        },
      ],
    }).compile();

    service = module.get(PasswordSetTokenService);
    configService = module.get(ConfigService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  describe('issue', () => {
    it('should store the hash of the token, not the token itself', async () => {
      const plaintext = await service.issue({
        userId: TEST_USER_ID,
        purpose: PasswordSetTokenPurpose.RESET,
      });

      expect(repository.replaceForUser).toHaveBeenCalledTimes(1);
      const [userId, purpose, stored] = repository.replaceForUser.mock.calls[0];
      expect(userId).toBe(TEST_USER_ID);
      expect(purpose).toBe(PasswordSetTokenPurpose.RESET);
      expect(stored.tokenHash).toBe(sha256Hex(plaintext));
      expect(stored.tokenHash).not.toBe(plaintext);
    });

    it('should return an opaque base64url token', async () => {
      const plaintext = await service.issue({
        userId: TEST_USER_ID,
        purpose: PasswordSetTokenPurpose.RESET,
      });

      expect(plaintext).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(plaintext).not.toContain('.');
    });

    it('should use the reset expiry config for reset tokens', async () => {
      await service.issue({
        userId: TEST_USER_ID,
        purpose: PasswordSetTokenPurpose.RESET,
      });

      expect(configService.get).toHaveBeenCalledWith(
        'auth.jwt.passwordResetExpiresIn',
        '2h',
      );
    });

    it('should use the initial-password expiry config for initial tokens', async () => {
      await service.issue({
        userId: TEST_USER_ID,
        purpose: PasswordSetTokenPurpose.INITIAL,
      });

      expect(configService.get).toHaveBeenCalledWith(
        'auth.jwt.initialPasswordExpiresIn',
        '7d',
      );
    });
  });

  describe('findValid', () => {
    it('should return the token when it is valid', async () => {
      const token = aPasswordSetToken();
      repository.findByTokenHash.mockResolvedValue(token);

      await expect(service.findValid('plaintext')).resolves.toBe(token);
      expect(repository.findByTokenHash).toHaveBeenCalledWith(
        sha256Hex('plaintext'),
      );
    });

    it('should throw when the token is unknown', async () => {
      repository.findByTokenHash.mockResolvedValue(null);

      await expect(service.findValid('nope')).rejects.toThrow(
        InvalidTokenError,
      );
    });

    it('should throw when the token is already used', async () => {
      repository.findByTokenHash.mockResolvedValue(
        aPasswordSetToken({ usedAt: new Date() }),
      );

      await expect(service.findValid('used')).rejects.toThrow(
        InvalidTokenError,
      );
    });

    it('should throw when the token is expired', async () => {
      repository.findByTokenHash.mockResolvedValue(
        aPasswordSetToken({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.findValid('expired')).rejects.toThrow(
        InvalidTokenError,
      );
    });
  });
});
