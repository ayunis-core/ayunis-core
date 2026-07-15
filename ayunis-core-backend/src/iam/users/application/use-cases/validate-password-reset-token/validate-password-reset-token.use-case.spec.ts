import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ValidatePasswordResetTokenUseCase } from './validate-password-reset-token.use-case';
import { ValidatePasswordResetTokenQuery } from './validate-password-reset-token.query';
import { PasswordSetTokenService } from '../../services/password-set-token.service';
import { InvalidTokenError } from 'src/iam/authentication/application/authentication.errors';
import {
  aPasswordSetToken,
  createMockPasswordSetTokensRepository,
} from '../../testing/password-set-token.fixtures';

describe('ValidatePasswordResetTokenUseCase', () => {
  let useCase: ValidatePasswordResetTokenUseCase;
  let mockTokenService: {
    findValid: jest.Mock;
  };
  const tokensRepository = createMockPasswordSetTokensRepository();

  beforeEach(async () => {
    mockTokenService = { findValid: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidatePasswordResetTokenUseCase,
        { provide: PasswordSetTokenService, useValue: mockTokenService },
      ],
    }).compile();

    useCase = module.get(ValidatePasswordResetTokenUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('should return valid:true for a valid token without consuming it', async () => {
    mockTokenService.findValid.mockResolvedValue(aPasswordSetToken());

    await expect(
      useCase.execute(new ValidatePasswordResetTokenQuery('token')),
    ).resolves.toEqual({ valid: true });
    // Read-only contract: validation must never consume the token.
    expect(tokensRepository.consume).not.toHaveBeenCalled();
  });

  it('should return valid:false for an invalid or expired token', async () => {
    mockTokenService.findValid.mockRejectedValue(
      new InvalidTokenError('Invalid or expired token'),
    );

    await expect(
      useCase.execute(new ValidatePasswordResetTokenQuery('bad')),
    ).resolves.toEqual({ valid: false });
  });
});
