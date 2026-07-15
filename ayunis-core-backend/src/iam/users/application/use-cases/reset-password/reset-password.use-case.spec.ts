import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { ResetPasswordCommand } from './reset-password.command';
import { UsersRepository } from '../../ports/users.repository';
import { PasswordSetTokenService } from '../../services/password-set-token.service';
import { PasswordSetTokensRepository } from '../../ports/password-set-tokens.repository';
import { HashTextUseCase } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.use-case';
import { IsValidPasswordUseCase } from '../is-valid-password/is-valid-password.use-case';
import {
  InvalidPasswordError,
  InvalidTokenError,
} from '../../../../authentication/application/authentication.errors';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import {
  aPasswordSetToken,
  createMockPasswordSetTokensRepository,
  TEST_USER_ID,
} from '../../testing/password-set-token.fixtures';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let mockTokenService: { findValid: jest.Mock };
  let mockTokensRepository: jest.Mocked<PasswordSetTokensRepository>;
  let mockUsersRepository: {
    findOneById: jest.Mock;
    update: jest.Mock;
  };
  let mockHashTextUseCase: { execute: jest.Mock };
  let mockIsValidPasswordUseCase: { execute: jest.Mock };

  const orgId = '660e8400-e29b-41d4-a716-446655440000' as UUID;

  const buildUser = () =>
    new User({
      id: TEST_USER_ID,
      name: 'Maria Müller',
      email: 'maria@gemeinde.de',
      emailVerified: true,
      passwordHash: 'old-hash',
      role: UserRole.USER,
      orgId,
      hasAcceptedMarketing: false,
    });

  beforeEach(async () => {
    mockTokenService = { findValid: jest.fn() };
    mockTokensRepository = createMockPasswordSetTokensRepository();
    mockUsersRepository = { findOneById: jest.fn(), update: jest.fn() };
    mockHashTextUseCase = { execute: jest.fn().mockResolvedValue('new-hash') };
    mockIsValidPasswordUseCase = { execute: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPasswordUseCase,
        { provide: PasswordSetTokenService, useValue: mockTokenService },
        {
          provide: PasswordSetTokensRepository,
          useValue: mockTokensRepository,
        },
        { provide: HashTextUseCase, useValue: mockHashTextUseCase },
        {
          provide: IsValidPasswordUseCase,
          useValue: mockIsValidPasswordUseCase,
        },
        { provide: UsersRepository, useValue: mockUsersRepository },
      ],
    }).compile();

    useCase = module.get(ResetPasswordUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  const command = () =>
    new ResetPasswordCommand('token', 'Str0ng!pass', 'Str0ng!pass');

  it('should update the password hash and consume the token', async () => {
    const user = buildUser();
    mockTokenService.findValid.mockResolvedValue(aPasswordSetToken());
    mockUsersRepository.findOneById.mockResolvedValue(user);

    await useCase.execute(command());

    expect(user.passwordHash).toBe('new-hash');
    expect(mockUsersRepository.update).toHaveBeenCalledWith(user);
    expect(mockTokensRepository.consume).toHaveBeenCalledTimes(1);
  });

  it('should reject and not write the password when the token is already consumed', async () => {
    mockTokenService.findValid.mockResolvedValue(aPasswordSetToken());
    mockUsersRepository.findOneById.mockResolvedValue(buildUser());
    // Concurrent redeem: the conditional update loses the race.
    mockTokensRepository.consume.mockResolvedValue(false);

    await expect(useCase.execute(command())).rejects.toThrow(InvalidTokenError);
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
  });

  it('should reject an invalid/expired/unknown token', async () => {
    mockTokenService.findValid.mockRejectedValue(
      new InvalidTokenError('Invalid or expired token'),
    );

    await expect(useCase.execute(command())).rejects.toThrow(InvalidTokenError);
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
    expect(mockTokensRepository.consume).not.toHaveBeenCalled();
  });

  it('should not consume the token when passwords do not match', async () => {
    mockTokenService.findValid.mockResolvedValue(aPasswordSetToken());

    await expect(
      useCase.execute(new ResetPasswordCommand('token', 'a', 'b')),
    ).rejects.toThrow(InvalidPasswordError);
    expect(mockTokensRepository.consume).not.toHaveBeenCalled();
  });

  it('should not consume the token when the password is too weak', async () => {
    mockTokenService.findValid.mockResolvedValue(aPasswordSetToken());
    mockIsValidPasswordUseCase.execute.mockResolvedValue(false);

    await expect(useCase.execute(command())).rejects.toThrow(
      InvalidPasswordError,
    );
    expect(mockTokensRepository.consume).not.toHaveBeenCalled();
  });

  it('should reject when the user no longer exists', async () => {
    mockTokenService.findValid.mockResolvedValue(aPasswordSetToken());
    mockUsersRepository.findOneById.mockResolvedValue(null);

    await expect(useCase.execute(command())).rejects.toThrow(InvalidTokenError);
    expect(mockTokensRepository.consume).not.toHaveBeenCalled();
  });
});
