import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SuperAdminTriggerPasswordResetUseCase } from './super-admin-trigger-password-reset.use-case';
import { SuperAdminTriggerPasswordResetCommand } from './super-admin-trigger-password-reset.command';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { PasswordSetTokenService } from 'src/iam/users/application/services/password-set-token.service';
import { PasswordSetTokenPurpose } from 'src/iam/users/domain/value-objects/password-set-token-purpose.enum';
import { SendPasswordResetEmailUseCase } from 'src/iam/users/application/use-cases/send-password-reset-email/send-password-reset-email.use-case';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import {
  UserInvalidInputError,
  UserNotFoundError,
} from 'src/iam/users/application/users.errors';
import type { UUID } from 'crypto';
import { GetOrgAuthenticationPolicyUseCase } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.use-case';

describe('SuperAdminTriggerPasswordResetUseCase', () => {
  let useCase: SuperAdminTriggerPasswordResetUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockPasswordSetTokenService: Partial<PasswordSetTokenService>;
  let mockSendPasswordResetEmailUseCase: Partial<SendPasswordResetEmailUseCase>;
  let mockConfigService: Partial<ConfigService>;
  let mockGetOrgAuthenticationPolicy: { execute: jest.Mock };

  const userId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
  const userEmail = 'maria.mueller@gemeinde.de';
  const userName = 'Maria Müller';
  const orgId = '660e8400-e29b-41d4-a716-446655440000' as UUID;
  const resetToken = 'opaque-reset-token-abc123';
  const frontendBaseUrl = 'http://localhost:3001';
  const passwordResetEndpoint = '/password/reset';

  const buildUser = (passwordHash: string | null = 'hashed-password') =>
    new User({
      id: userId,
      name: userName,
      email: userEmail,
      emailVerified: true,
      passwordHash,
      role: UserRole.USER,
      orgId,
      hasAcceptedMarketing: false,
    });

  beforeAll(async () => {
    mockUsersRepository = {
      findOneById: jest.fn(),
    };

    mockPasswordSetTokenService = {
      issue: jest.fn(),
    };

    mockSendPasswordResetEmailUseCase = {
      execute: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn(),
    };
    mockGetOrgAuthenticationPolicy = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminTriggerPasswordResetUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        {
          provide: PasswordSetTokenService,
          useValue: mockPasswordSetTokenService,
        },
        {
          provide: SendPasswordResetEmailUseCase,
          useValue: mockSendPasswordResetEmailUseCase,
        },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: GetOrgAuthenticationPolicyUseCase,
          useValue: mockGetOrgAuthenticationPolicy,
        },
      ],
    }).compile();

    useCase = module.get<SuperAdminTriggerPasswordResetUseCase>(
      SuperAdminTriggerPasswordResetUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrgAuthenticationPolicy.execute.mockResolvedValue({
      localPasswordLoginEnabled: true,
    });

    jest
      .spyOn(mockPasswordSetTokenService, 'issue')
      .mockResolvedValue(resetToken);
    jest
      .spyOn(mockSendPasswordResetEmailUseCase, 'execute')
      .mockResolvedValue(undefined);
    jest.spyOn(mockConfigService, 'get').mockImplementation((key: string) => {
      if (key === 'app.frontend.baseUrl') return frontendBaseUrl;
      if (key === 'app.frontend.passwordResetEndpoint')
        return passwordResetEndpoint;
      return undefined;
    });
  });

  it('should send the password reset email and return the reset url', async () => {
    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValue(buildUser());

    const command = new SuperAdminTriggerPasswordResetCommand(userId);
    const result = await useCase.execute(command);

    expect(result.resetUrl).toBe(
      `${frontendBaseUrl}${passwordResetEndpoint}?token=${resetToken}`,
    );
    expect(mockPasswordSetTokenService.issue).toHaveBeenCalledWith({
      userId,
      purpose: PasswordSetTokenPurpose.RESET,
    });
    expect(mockSendPasswordResetEmailUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail,
        resetToken,
        userName,
      }),
    );
  });

  it('should throw UserNotFoundError when user does not exist', async () => {
    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(null);

    const command = new SuperAdminTriggerPasswordResetCommand(userId);

    await expect(useCase.execute(command)).rejects.toThrow(UserNotFoundError);
    expect(mockSendPasswordResetEmailUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects password reset for a user without a local password', async () => {
    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValue(buildUser(null));

    await expect(
      useCase.execute(new SuperAdminTriggerPasswordResetCommand(userId)),
    ).rejects.toThrow(UserInvalidInputError);

    expect(mockPasswordSetTokenService.issue).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmailUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects password reset when the organization requires SSO', async () => {
    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValue(buildUser());
    mockGetOrgAuthenticationPolicy.execute.mockResolvedValue({
      localPasswordLoginEnabled: false,
    });

    await expect(
      useCase.execute(new SuperAdminTriggerPasswordResetCommand(userId)),
    ).rejects.toThrow(UserInvalidInputError);

    expect(mockPasswordSetTokenService.issue).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmailUseCase.execute).not.toHaveBeenCalled();
  });
});
