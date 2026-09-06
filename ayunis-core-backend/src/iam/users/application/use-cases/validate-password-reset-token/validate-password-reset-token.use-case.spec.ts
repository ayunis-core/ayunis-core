import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ValidatePasswordResetTokenUseCase } from './validate-password-reset-token.use-case';
import { ValidatePasswordResetTokenQuery } from './validate-password-reset-token.query';
import { PasswordSetTokenService } from 'src/iam/users/application/services/password-set-token.service';
import { InvalidTokenError } from 'src/iam/authentication/application/authentication.errors';
import {
  aPasswordSetToken,
  createMockPasswordSetTokensRepository,
} from 'src/iam/users/application/testing/password-set-token.fixtures';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { GetOrgAuthenticationPolicyUseCase } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.use-case';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

describe('ValidatePasswordResetTokenUseCase', () => {
  let useCase: ValidatePasswordResetTokenUseCase;
  let mockTokenService: {
    findValid: jest.Mock;
  };
  let mockUsersRepository: { findOneById: jest.Mock };
  let mockGetOrgAuthenticationPolicy: { execute: jest.Mock };
  const tokensRepository = createMockPasswordSetTokensRepository();

  beforeEach(async () => {
    mockTokenService = { findValid: jest.fn() };
    mockUsersRepository = { findOneById: jest.fn() };
    mockGetOrgAuthenticationPolicy = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidatePasswordResetTokenUseCase,
        { provide: PasswordSetTokenService, useValue: mockTokenService },
        { provide: UsersRepository, useValue: mockUsersRepository },
        {
          provide: GetOrgAuthenticationPolicyUseCase,
          useValue: mockGetOrgAuthenticationPolicy,
        },
      ],
    }).compile();

    useCase = module.get(ValidatePasswordResetTokenUseCase);
    mockUsersRepository.findOneById.mockResolvedValue(user());
    mockGetOrgAuthenticationPolicy.execute.mockResolvedValue({
      localPasswordLoginEnabled: true,
    });
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

  it('returns valid:false when the organization requires SSO', async () => {
    mockTokenService.findValid.mockResolvedValue(aPasswordSetToken());
    mockGetOrgAuthenticationPolicy.execute.mockResolvedValue({
      localPasswordLoginEnabled: false,
    });

    await expect(
      useCase.execute(new ValidatePasswordResetTokenQuery('token')),
    ).resolves.toEqual({ valid: false });
  });

  function user(): User {
    return new User({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'user@example.com',
      emailVerified: true,
      passwordHash: 'hash',
      role: UserRole.USER,
      orgId: '22222222-2222-2222-2222-222222222222',
      name: 'User',
      hasAcceptedMarketing: false,
    });
  }
});
